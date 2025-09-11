////import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";
import { Email } from "./entities/email.entity";
import { ApiError } from "src/utils/errors";
import { randomInt } from "crypto";

export class EmailService {
  private readonly transporter: Transporter;

  constructor(
    ////private readonly configService: ConfigService
  ) {

    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '993', 993),
      secure: process.env.SMTP_SECURE === 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(email: Email): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email.to,
        subject: email.subject,
        text: email.text_body
      };
      await this.transporter.sendMail(mailOptions);
      return undefined;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw ApiError.internalServerError("Failed to send email");
    }
  }

  // all could be in one function with .html and .txt in it

  async sendPasswordResetEmail(email: string): Promise<string> {
    const code = randomInt(0, 1000000).toString().padStart(6, "0");

    const emailData: Email = {
      to: email,
      subject: "Password Reset Request",
      text_body: `Hello,\n\nYour password recovery code is:\n\n${code}\n\n\
                Please enter this code in the app to reset your password.\n\
                If you did not request a password reset, please ignore this email.\n\n\
                Best regards,\nApp Team`,
    };

    await this.sendEmail(emailData)
    return code
  }

  async sendVerificationEmail(email: string): Promise<string> {
    const code = randomInt(0, 1000000).toString().padStart(6, "0");

    const emailData: Email = {
      to: email,
      subject: "Password Reset Request",
      text_body: `Hello,\n\nYour email verification code is:\n\n${code}\n\n\
                Please enter this code in the app to validate your email.\n\
                If you did not request sign up, please ignore this email.\n\n\
                Best regards,\nApp Team`,
    };

    await this.sendEmail(emailData)
    return code
  }
}
