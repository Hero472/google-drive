
import { Types } from 'mongoose';
import { CreateUserDto } from '../dto/create-user.dto';

export enum UserRole {
    ADMIN = "Admin",
    USER = "User"
}

export class User {
    _id!: Types.ObjectId;
    username!: string;
    email!: string;
    password!: string;
    role!: UserRole;
    access_token!: string | null;
    refresh_token!: string | null;
    is_active!: boolean;
    email_verified!: boolean;   
    verification_code!: string;
    verification_code_expires!: Date;
    password_reset_code!: string | null;
    password_reset_expires!: Date | null;
    reset_password_token!: string | null;
    reset_password_expires!: Date | null;
    createdAt!: Date;
    updatedAt!: Date;

    constructor(createUserDto: CreateUserDto, hashedPassword: string, verificationCode: string) {
        this._id = new Types.ObjectId();
        this.username = createUserDto.username;
        this.email = createUserDto.email;
        this.password = hashedPassword;
        this.role = UserRole.USER;
        this.access_token = null;
        this.refresh_token = null;
        this.is_active = true;
        this.email_verified = false;
        this.verification_code = verificationCode;
        this.verification_code_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.password_reset_code = null;
        this.password_reset_expires = null;
        this.reset_password_token = null;
        this.reset_password_expires = null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

export class UserLoginReceive {
    email!: string;
    password!: string;
}

export class UserSend {
    _id?: Types.ObjectId;
    username!: string;
    email!: string;
    role!: UserRole;
    access_token?: string;
}