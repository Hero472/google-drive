import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
import { UserRole } from '../entities/user.entity';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id!: ObjectId;

  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: 'user' })
  role!: UserRole;

  @Prop({ default: null })
  access_token?: string;

  @Prop({ default: null })
  refresh_token?: string;

  @Prop({ default: true })
  is_active!: boolean;

  @Prop({ default: false })
  email_verified!: boolean;

  @Prop({ default: null })
  verification_code?: string;

  @Prop({ default: null })
  verification_code_expires?: Date;

  @Prop({ default: null })
  password_reset_code?: string;

  @Prop({ default: null })
  password_reset_expires?: Date;

  @Prop({ default: null })
  reset_password_token?: string;

  @Prop({ default: null })
  reset_password_expires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);