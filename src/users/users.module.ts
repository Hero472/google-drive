import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmailService } from '../email/email.service';
import { AuthUtils } from '../utils/auth';
import { Validator } from '../utils/validator';
import { User, UserSchema } from './schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    EmailService,
    AuthUtils, 
    Validator,
  ],
  exports: [UsersService],
})
export class UsersModule {}
