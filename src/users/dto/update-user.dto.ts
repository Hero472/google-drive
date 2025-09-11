import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    updatedAt?: Date;
    is_active?: boolean;
    role?: UserRole;
    access_token?: string;
    refresh_token?: string;
}
