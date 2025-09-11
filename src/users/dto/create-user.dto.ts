import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {

    username!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;
}
