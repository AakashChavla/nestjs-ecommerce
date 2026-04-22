import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { generateEmailTemplate } from './mail.template';
import { REGEX } from '../constant/regex';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private isMailServiceReady: boolean = false;

  constructor() {
    const transportOptions: SMTPTransport.Options = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // Nodemailer types are not fully picked up by the linter in this setup,
    // so we explicitly cast the created transporter while suppressing
    // unsafe-access warnings for this external library call.

    this.transporter = nodemailer.createTransport(
      transportOptions,
    ) as nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  }

  async onModuleInit() {
    await this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.isMailServiceReady = true;
      this.logger.log('✅ Mail service connected successfully');
    } catch (error: unknown) {
      this.isMailServiceReady = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        '⚠️  Mail service configuration issue - emails will not be sent',
        errorMessage,
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = REGEX.EMAIL;
    return emailRegex.test(email);
  }

  async sendEmail(options: EmailOptions) {
    if (
      !options.to ||
      (Array.isArray(options.to)
        ? options.to.some((email) => !this.isValidEmail(email))
        : !this.isValidEmail(options.to))
    ) {
      this.logger.error('Invalid email address:', options.to);
      throw new Error('Invalid email address provided');
    }

    if (!this.isMailServiceReady) {
      this.logger.error('Mail service is not ready. Cannot send email.');
      throw new Error('Mail service is not configured properly');
    }

    this.logger.log('Attempting to send email to:', options.to);
    this.logger.log('Subject:', options.subject);

    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || 'E-Commerce API'}" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    try {
      // External library call; types are not fully resolved by the linter in this setup,
      // so we explicitly suppress unsafe-call/member-access/assignment here.

      const rawResult: unknown = await this.transporter.sendMail(mailOptions);

      const result = rawResult as SMTPTransport.SentMessageInfo;

      this.logger.log(`Email sent successfully to ${options.to}`);

      return {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
      );
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  async sendOtp(email: string, otp: string) {
    const subject = 'Your OTP for Verification';
    const message = `
    Your OTP for verification is: <strong>${otp}</strong>.<br/><br/>
    This OTP is valid for <strong>5 minutes</strong>. 
    Please use it to complete your verification process.
  `;

    await this.sendEmail({
      to: email,
      subject,
      html: generateEmailTemplate(subject, message),
    });
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string,
  ) {
    const subject = 'Verify Your Email Address';
    const message = `
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with E-Commerce API. To complete your registration, please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Verify Email Address
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p><strong>Note:</strong> This verification link will expire in 24 hours and can only be used once.</p>
      <p>If you did not create an account with us, please ignore this email.</p>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html: generateEmailTemplate(subject, message),
    });

    this.logger.log(`Verification email sent to ${email}`);
  }

  async sendVerifiedSuccessMail(email: string, name: string) {
    const subject = 'Email Verified Successful';
    const message = `
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering with E-Commerce API. Your Email: ${email} verified successfully.</p>
     `;

    await this.sendEmail({
      to: email,
      subject,
      html: generateEmailTemplate(subject, message),
    });
  }
}
