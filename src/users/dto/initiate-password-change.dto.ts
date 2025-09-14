import {IsEmail } from 'class-validator';

export class InitiatePasswordChange {

  @IsEmail()
  email!: string;

}