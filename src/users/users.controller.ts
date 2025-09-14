import {
  Controller,
  Post,
  Body,
  InternalServerErrorException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import {
  ApiError,
  ApiResponse,
  errorResponse,
  successResponse,
} from "src/utils/errors";
import { UserLoginReceive, UserSend } from "./entities/user.entity";
import { ObjectId } from "mongoose";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { InitiatePasswordChange } from "./dto/initiate-password-change.dto";
import { VerifyPasswordChange, VerifyPasswordChangeReturn } from "./dto/verify-password-change.dto";
import { CompletePasswordChange } from "./dto/complete-password-change.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("register")
  async create(
    @Body() createUserDto: CreateUserDto
  ): Promise<ApiResponse<UserSend>> {
    try {
      const user = await this.usersService.create(createUserDto);
      return successResponse<UserSend>(user);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("login")
  async login(
    @Body() credentials: UserLoginReceive
  ): Promise<ApiResponse<UserSend>> {
    try {
      const user = await this.usersService.login(credentials);
      return successResponse<UserSend>(user);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("verify-email")
  async verifyEmail(
    @Body() verificationToken: VerifyEmailDto
  ): Promise<ApiResponse<void>> {
    try {
      await this.usersService.verifyEmail(verificationToken);
      return successResponse<void>(undefined);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("initiate-password-change")
  async initiatePasswordChange(
    @Body() credentials: InitiatePasswordChange
  ): Promise<ApiResponse<{ resetToken: string; expiresAt: Date }>> {
    try {
      const codes = await this.usersService.initiatePasswordChange(credentials.email);
      return successResponse<{ resetToken: string; expiresAt: Date }>(codes);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("verify-password-change")
  async verifyPasswordChange(
    @Body() tokens: VerifyPasswordChange
  ): Promise<ApiResponse<VerifyPasswordChangeReturn>> {
    try {
      const result = await this.usersService.verifyPasswordChangeCode(tokens);
      return successResponse<VerifyPasswordChangeReturn>(result);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("complete-password-change")
  async completePasswordChange(
    @Body() tokens: CompletePasswordChange
  ): Promise<ApiResponse<void>> {
    try {
      await this.usersService.completePasswordChange(tokens);
      return successResponse<void>(undefined);
    } catch (e: unknown) {
      if (e instanceof ApiError) throw e;

      throw new InternalServerErrorException(
        errorResponse(new ApiError("Internal Server Error", 500))
      );
    }
  }

  @Post("remove")
  async remove(
    @Body() id: ObjectId,
  ): Promise<ApiResponse<void>> {
    try {
      await this.usersService.remove(id);
      return successResponse<void>(undefined);
    } catch (e: unknown) {
      if (e instanceof ApiError) return errorResponse(e);

      return {
        success: false,
        error: {
          error: "Internal Server Error",
          code: 500,
        },
      };
    }
  }
}
