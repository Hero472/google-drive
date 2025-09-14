import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import { Validator } from "../utils/validator";
import { ApiError } from "../utils/errors";
import {
  User,
  UserLoginReceive,
  UserRole,
  UserSend,
} from "./entities/user.entity";
import { Model, ObjectId, Types } from "mongoose";
import { UserDocument } from "./schemas/user.schema";
import { InjectModel } from "@nestjs/mongoose";
import { AuthUtils } from "../utils/auth";
import { EmailService } from "../email/email.service";
import { randomBytes } from "crypto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { VerifyPasswordChange, VerifyPasswordChangeReturn } from "./dto/verify-password-change.dto";
import { CompletePasswordChange } from "./dto/complete-password-change.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly validator: Validator,
    private readonly authUtils: AuthUtils
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserSend> {
    try {
      this.validator.validateEmail(createUserDto.email);
      this.validator.validatePasswordStrength(createUserDto.password);

      let existingUser = await this.findOneByEmail(createUserDto.email);

      if (existingUser) {
        if (existingUser.email_verified) {
          throw ApiError.unauthorized(
            "An account with this email already exists but is not verified. If you don't remember your password, please use the password recovery option."
          );
        } else {
          throw ApiError.badRequest("User with this email already exists");
        }
      }

      const hashedPassword = await this.authUtils.hashPassword(
        createUserDto.password
      );

      const code = await this.emailService.sendVerificationEmail(
        createUserDto.email
      );

      let userData = new User(createUserDto, hashedPassword, code);

      console.log(userData);

      const createdUser = this.userModel.insertOne(userData);

      const userSend: UserSend = {
        _id: (await createdUser).id,
        username: createUserDto.username,
        email: createUserDto.email,
        role: UserRole.USER,
        access_token: undefined,
      };
      return userSend;
    } catch (e: unknown) {
      console.log(e);
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof Error) {
        throw ApiError.internalServerError("Failed to create user");
      }

      throw ApiError.internalServerError(
        "Failed to create user due to unknown error"
      );
    }
  }

  async login(credentials: UserLoginReceive): Promise<UserSend> {
    try {
      let user = await this.findOneByEmail(credentials.email);

      if (!user) {
        throw ApiError.badRequest("Invalid email or password");
      }

      const isPasswordValid = await this.authUtils.verifyPassword(
        credentials.password,
        user.password
      );

      if (!isPasswordValid) {
        throw ApiError.unauthorized("Invalid email or password");
      }

      if (!user.email_verified) {
        throw ApiError.unauthorized(
          "Email not verified. Please check your email for verification instructions."
        );
      }

      if (user.is_active === false) {
        throw ApiError.unauthorized(
          "Account is deactivated. Please contact support."
        );
      }

      const accessToken = this.authUtils.generateToken(user.email, 60 * 24); // 24 hours
      const refreshToken = this.authUtils.generateToken(
        user.email,
        60 * 24 * 30
      ); // 30 days

      user.access_token = accessToken;
      user.refresh_token = refreshToken;

      await this.updateTokens(user._id, accessToken, refreshToken);

      const userSend: UserSend = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || UserRole.USER,
        access_token: accessToken,
      };

      return userSend;
    } catch (e: unknown) {
      console.log("error: "+e)
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof ApiError && e.getStatus() === 404) {
        throw ApiError.unauthorized("Invalid email or password");
      }

      throw ApiError.internalServerError("Login failed");
    }
  }

  async verifyEmail(verificationToken: VerifyEmailDto): Promise<void> {
    const user = await this.findOneByEmail(verificationToken.email);

    if (!user) {
      throw ApiError.badRequest("Invalid or expired verification token");
    } else {
      if (user.verification_code != verificationToken.code) {
        throw ApiError.badRequest("Invalid or expired verification token");
      }

      if (user.verification_code_expires <= new Date()) {
        throw ApiError.badRequest("Invalid or expired verification token");
      }
    }

    if (user.email_verified) {
      throw ApiError.badRequest("User is already verified");
    }

    const result = await this.userModel
      .updateOne(
        { _id: user._id },
        {
          $set: {
            email_verified: true,
            verification_token: null,
            verification_token_expires: null,
            updated_at: new Date(),
          },
        }
      )
      .exec();

    if (result.matchedCount === 0) {
      throw ApiError.notFound("User not found during verification");
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ email: email }).exec();

      if (user) {
        return {
          _id: user._id,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role,
          access_token: user.access_token || null,
          refresh_token: user.refresh_token || null,
          is_active: user.is_active,
          email_verified: user.email_verified,
          verification_code: user.verification_code || null,
          verification_code_expires: user.verification_code_expires || null,
          password_reset_code: user.password_reset_code || null,
          password_reset_expires: user.password_reset_expires || null,
          reset_password_token: user.reset_password_token || null,
          reset_password_expires: user.reset_password_expires || null
        } as unknown as User;
      }
      return null;
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof Error) {
        throw ApiError.internalServerError("Failed to find user");
      }

      throw ApiError.internalServerError(
        "Failed to find user due to unknown error"
      );
    }
  }

  async update(id: ObjectId, updateUserDto: UpdateUserDto): Promise<void> {
    try {
      const updateData: UpdateUserDto = { updatedAt: new Date() };

      if (updateUserDto.is_active !== undefined) {
        updateData.is_active = updateUserDto.is_active;
      }

      if (updateUserDto.role !== undefined) {
        updateData.role = updateUserDto.role;
      }

      this.userModel.updateOne({ _id: id }, updateData);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof Error) {
        // Handle MongoDB errors
        if (e.name === "CastError") {
          throw ApiError.badRequest("Invalid user ID format");
        }

        throw ApiError.internalServerError("Failed to update user");
      }

      throw ApiError.internalServerError(
        "Failed to update user due to unknown error"
      );
    }
  }

  async initiatePasswordChange(
    email: string
  ): Promise<{ resetToken: string; expiresAt: Date }> {
    try {
      const user = await this.findOneByEmail(email)
      console.log(user)
      if (!user) {
        // Don't reveal if email exists for security
        throw ApiError.notFound(
          "If the email exists, a password reset code has been sent"
        );
      }

      // Generate 6-digit verification code
      const verificationCode =
        await this.emailService.sendPasswordResetEmail(email);

      // Generate secure reset token
      const resetToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store both code and token
      await this.userModel
        .updateOne(
          { _id: user._id },
          {
            $set: {
              password_reset_code: verificationCode,
              password_reset_expires: expiresAt,
              reset_password_token: resetToken,
              reset_password_expires: expiresAt,
              updated_at: new Date(),
            },
          }
        )
        .exec();

      return { resetToken, expiresAt };
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw e;
      }
      throw ApiError.internalServerError("Failed to initiate password change");
    }
  }

  async verifyPasswordChangeCode(
    tokens: VerifyPasswordChange
  ): Promise<VerifyPasswordChangeReturn> {
    try {
      const user = await this.findOneByEmail(tokens.email)

      if (!user) {
        return {
          isValid: false,
          message: "Invalid or expired verification code",
        };
      }

      if (user.reset_password_token != tokens.resetToken) {
        return {
          isValid: false,
          message: "Invalid or expired verification code",
        };
      }

      if (user.password_reset_code != tokens.code) {
        return {
          isValid: false,
          message: "Invalid or expired verification code",
        };
      }

      // Code is valid - you might want to mark it as used or extend the token
      await this.userModel
        .updateOne(
          { _id: user._id },
          {
            $set: {
              reset_password_expires: new Date(Date.now() + 5 * 60 * 1000), // Extend 5 more minutes
              updated_at: new Date(),
              password_reset_code: null
            },
          }
        )
        .exec();

      return { isValid: true, message: "Verification code accepted" };
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw e;
      }
      throw ApiError.internalServerError(
        "Failed to verify password change code"
      );
    }
  }

  async completePasswordChange(
    tokens: CompletePasswordChange
  ): Promise<void> {
    try {
      const user = await this.findOneByEmail(tokens.email);

      if (!user) {
        throw ApiError.badRequest("Invalid or expired reset token");
      }

      if (user.reset_password_token != tokens.resetToken) {
        throw ApiError.badRequest("Invalid or expired reset token");
      }

      // Validate new password strength
      this.validator.validatePasswordStrength(tokens.newPassword);

      // Hash new password
      const hashedPassword = await this.authUtils.hashPassword(tokens.newPassword);

      // Update password and clear all reset data
      const result = await this.userModel
        .updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedPassword,
              updated_at: new Date(),
              reset_password_token: null,
              reset_password_expires: null,
              password_reset_code: null,
              password_reset_code_expires: null,
              access_token: null,
              refresh_token: null,
            },
          }
        )
        .exec();

      if (result.matchedCount === 0) {
        throw ApiError.notFound("User not found during password update");
      }
    } catch (e: unknown) {
      console.log(e)
      if (e instanceof ApiError) {
        throw e;
      }
      throw ApiError.internalServerError("Failed to complete password change");
    }
  }

  async updateTokens(
    userId: Types.ObjectId,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    try {
      const result = await this.userModel
        .updateOne(
          { _id: userId },
          {
            $set: {
              access_token: accessToken,
              refresh_token: refreshToken,
              updated_at: new Date(),
            },
          }
        )
        .exec();

      if (result.matchedCount === 0) {
        throw ApiError.notFound("User not found");
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        throw e;
      }

      if (e instanceof Error) {
        if (e.name === "MongoError") {
          throw ApiError.internalServerError(
            "Failed to update user tokens due to database error"
          );
        }

        throw ApiError.internalServerError(
          "Failed to update tokens due to system error"
        );
      }

      throw ApiError.internalServerError("Failed to update tokens");
    }
  }

  async changePassword(
    userId: ObjectId,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const isCurrentPasswordValid = await this.authUtils.verifyPassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw ApiError.unauthorized("Current password is incorrect");
    }

    this.validator.validatePasswordStrength(newPassword);

    const hashedPassword = await this.authUtils.hashPassword(newPassword);

    const result = await this.userModel
      .updateOne(
        { _id: userId },
        {
          $set: {
            password: hashedPassword,
            updated_at: new Date(),
            access_token: null,
            refresh_token: null,
          },
        }
      )
      .exec();

    if (result.matchedCount === 0) {
      throw ApiError.notFound("User not found during update");
    }
  }

  async remove(id: ObjectId): Promise<void> {
    try {
      const result = await this.userModel
        .updateOne(
          { _id: id },
          {
            $set: {
              is_active: false,
              access_token: null, // Invalidate active sessions
              refresh_token: null, // Invalidate refresh tokens
              updated_at: new Date(),
            },
          }
        )
        .exec();

      if (result.matchedCount === 0) {
        throw ApiError.notFound(`User not found`);
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "CastError") {
          throw ApiError.badRequest("Invalid user ID format");
        }

        throw ApiError.internalServerError("Failed to deactivate user");
      }

      throw ApiError.internalServerError(
        "Failed to deactivate user due to unknown error"
      );
    }
  }
}
