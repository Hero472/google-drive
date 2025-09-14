import { IsEmail, IsString, Length } from "class-validator";

export class CompletePasswordChange {
  @IsEmail()
  email!: string;

  @IsString()
  resetToken!: string;

  @IsString()
  @Length(8, 8, { message: "Verification code must be 6 digits" })
  newPassword!: string;
}