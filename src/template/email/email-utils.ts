import * as nodemailer from 'nodemailer';

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendMail(options: SendMailOptions) {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };
  return transporter.sendMail(mailOptions);
}