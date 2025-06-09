import { Injectable } from '@nestjs/common';
import { sendMail } from '../template/email/email-utils';
import { getStyledHtml } from 'src/template/email/email templates/getStyle';

@Injectable()
export class NotificationsService {
  async sendOtp(email: string, otp: string) {
    const subject = 'Your OTP Code';
    const message = `Your One-Time Password (OTP) is <b>${otp}</b>. This code is valid for 5 minutes.`;
    return sendMail({
      to: email,
      subject,
      text: `Your One-Time Password (OTP) is ${otp}. This code is valid for 5 minutes.`,
      html: getStyledHtml(subject, message),
    });
  }
}