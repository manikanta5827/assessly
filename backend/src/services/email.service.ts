import { Resend } from 'resend';
import { getMagicLinkHtml } from './email-templates';

export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');
    this.fromEmail = process.env.EMAIL_SENDER || 'onboarding@resend.dev';
  }

  /**
   * Generic method to send an email using Resend.
   */
  async sendEmail(to: string, subject: string, html: string) {
    // If we're in development and don't have a real API key, just log it
    if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
      console.log(`[DEV] Email would be sent to ${to}`);
      console.log(`Subject: ${subject}`);
      // console.log(`HTML: ${html}`); // Useful for deep debugging
    }

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Resend sending failed, but continuing because NOT in production');
        return;
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Resend email sent successfully:', data?.id);
  }

  /**
   * Helper method specifically for authentication magic links.
   */
  async sendMagicLink(email: string, link: string) {
    const html = getMagicLinkHtml(link);
    await this.sendEmail(email, 'Your Assessly Magic Link', html);
  }
}
