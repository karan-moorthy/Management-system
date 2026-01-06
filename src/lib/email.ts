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
    
    console.log('📧 Attempting to send email via Gmail SMTP:', {
      from: from || process.env.GMAIL_USER,
      to: recipients,
      subject,
      gmailUser: process.env.GMAIL_USER ? '✅ Set' : '❌ Not set',
      gmailPassword: process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set',
    });
    
    try {
      const info = await this.transporter.sendMail({
        from: from || process.env.GMAIL_USER,
        to: recipients,
        subject,
        html,
      });
      
      console.log('✅ Email sent successfully:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      });
    } catch (error: any) {
      console.error('❌ Failed to send email via Gmail:', {
        error: error.message,
        code: error.code,
        command: error.command,
      });
      throw new Error(`Gmail SMTP Error: ${error.message}`);
    }
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
  console.log('🔧 Creating email service...', {
    hasGmailUser: !!process.env.GMAIL_USER,
    hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
    hasResendKey: !!process.env.RESEND_API_KEY,
  });
  
  // Option 1: Gmail SMTP (recommended for testing - no domain verification)
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (gmailUser && gmailAppPassword) {
    try {
      console.log('📮 Using Gmail SMTP email service');
      console.log('⚠️ If emails don\'t arrive, check:');
      console.log('  1. Gmail App Password is correct (not regular password)');
      console.log('  2. Check recipient spam/junk folder');
      console.log('  3. Verify sender email:', gmailUser);
      return new GmailEmailService(gmailUser, gmailAppPassword);
    } catch (error) {
      console.warn('Gmail service failed, falling back to Resend:', error);
    }
  }
  
  // Option 2: Resend API (requires domain verification for production)
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    console.log('📮 Using Resend email service');
    return new ResendEmailService(resendApiKey);
  }
  
  // Fallback: Console logging for development
  console.warn('⚠️ No email service configured, using console logger');
  return new ConsoleEmailService();
};

export type { SendEmailParams, EmailService };