/* eslint-disable @typescript-eslint/no-var-requires */
const nodemailer = require('nodemailer');
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@example.com';

let transporter: any = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (transporter) {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } else {
    // Fallback to console logging in development
    console.log('=== Email (fallback) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    if (html) console.log(html);
    console.log('=== End Email ===');
  }
}
