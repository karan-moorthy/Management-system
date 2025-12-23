// Email service using Resend (you can replace with any email provider)
// Install with: npm install resend

interface SendEmailParams {
  to: string | string[]; // Single email or array of emails
  subject: string;
  html: string;
  from?: string;
}

interface EmailService {
  sendEmail(params: SendEmailParams): Promise<void>;
}

// Gmail SMTP implementation (no domain verification needed)
class GmailEmailService implements EmailService {
  private transporter: any;

  constructor(email: string, appPassword: string) {
    // Dynamic import to avoid issues if nodemailer not installed
    const nodemailer = require('nodemailer');
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: appPassword, // Use App Password, not regular password
      },
    });
  }

  async sendEmail({ to, subject, html, from }: SendEmailParams): Promise<void> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    
    await this.transporter.sendMail({
      from: from || process.env.GMAIL_USER,
      to: recipients,
      subject,
      html,
    });
  }
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

    // Ensure 'to' is always an array for Resend API
    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'PMS Team <noreply@yourdomain.com>',
        to: recipients,
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
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    console.log('\n=== EMAIL WOULD BE SENT ===');
    console.log(`To: ${recipients}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    console.log('============================\n');
  }
}

// Factory function to get the appropriate email service
export const createEmailService = (): EmailService => {
  // Option 1: Gmail SMTP (recommended for testing - no domain verification)
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (gmailUser && gmailAppPassword) {
    try {
      return new GmailEmailService(gmailUser, gmailAppPassword);
    } catch (error) {
      console.warn('Gmail service failed, falling back to Resend:', error);
    }
  }
  
  // Option 2: Resend API (requires domain verification for production)
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    return new ResendEmailService(resendApiKey);
  }
  
  // Fallback: Console logging for development
  return new ConsoleEmailService();
};

export type { SendEmailParams, EmailService };