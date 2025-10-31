// Email service using Resend (you can replace with any email provider)
// Install with: npm install resend

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface EmailService {
  sendEmail(params: SendEmailParams): Promise<void>;
}

// Resend implementation
class ResendEmailService implements EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail({ to, subject, html, from }: SendEmailParams): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Email service not configured. Please add RESEND_API_KEY to your environment variables.");
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'PMS Team <noreply@yourdomain.com>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send email: ${error.message || 'Unknown error'}`);
    }
  }
}

// Fallback console logger for development
class ConsoleEmailService implements EmailService {
  async sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
    console.log('\n=== EMAIL WOULD BE SENT ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    console.log('============================\n');
  }
}

// Factory function to get the appropriate email service
export const createEmailService = (): EmailService => {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey && process.env.NODE_ENV === 'production') {
    return new ResendEmailService(resendApiKey);
  }
  
  // Use console service for development or when no API key is provided
  return new ConsoleEmailService();
};

export type { SendEmailParams, EmailService };