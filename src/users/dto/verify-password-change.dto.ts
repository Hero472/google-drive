import { IsEmail, IsString, MinLength } from "class-validator";

export class VerifyPasswordChange {
  @IsEmail()
  email!: string;

  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  code!: string;
}

export class VerifyPasswordChangeReturn {
  isValid!: boolean;

  message!: string;
}
