import sgMail from '@sendgrid/mail';

export class EmailService {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('[EmailService] ERROR: SENDGRID_API_KEY is not set in environment variables');
      return;
    }
    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.error('[EmailService] ERROR: SENDGRID_FROM_EMAIL is not set in environment variables');
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('[EmailService] Initialized with SendGrid');
    console.log('[EmailService] From email:', process.env.SENDGRID_FROM_EMAIL);
  }

  async sendDowntimeNotification(email: string, websiteUrl: string, downtimeDuration: number) {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.error('[EmailService] Cannot send email: SendGrid configuration is missing');
      return;
    }

    console.log(`[EmailService] Preparing to send notification to ${email} for ${websiteUrl}`);
    console.log(`[EmailService] Downtime duration: ${downtimeDuration} minutes`);
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Website Down Alert: ${websiteUrl}`,
      html: `
        <h2>Website Down Alert</h2>
        <p>The following website has been down for more than ${downtimeDuration} minutes:</p>
        <p><strong>Website URL:</strong> ${websiteUrl}</p>
        <p>Please check the website status and take necessary actions.</p>
      `,
    };

    try {
      console.log('[EmailService] Sending email via SendGrid...');
      const response = await sgMail.send(msg);
      console.log('[EmailService] Email sent successfully:', response);
      console.log(`[EmailService] Downtime notification sent to ${email} for ${websiteUrl}`);
    } catch (error: any) {
      console.error('[EmailService] Error sending email notification:', error);
      if (error.response) {
        console.error('[EmailService] SendGrid API Error:', error.response.body);
      }
      throw error;
    }
  }
} 