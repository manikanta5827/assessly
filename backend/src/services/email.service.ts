import { Resend } from 'resend';

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
  async sendEmail(to: string, templateId: string, variables: any) {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [to],
      template: {
        id: templateId,
        variables: variables,
      },
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Resend email sent successfully:', data?.id);
  }

  async sendMagicLink(email: string, link: string) {
    await this.sendEmail(email, 'sign-in-email', { link: link });
  }

  async sendAssessmentEmail(email: string, submissionLink: string, assessmentDocsLink: string) {
    await this.sendEmail(email, 'assessment-email', { submissionLink: submissionLink, assessmentDocsLink: assessmentDocsLink });
  }
}
