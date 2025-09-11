import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
