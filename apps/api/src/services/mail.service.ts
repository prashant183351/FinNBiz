import nodemailer from 'nodemailer';

// Helper service to send emails using Nodemailer and Brevo (or any SMTP)
export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
      console.warn('SMTP_URL is not configured in .env. Falling back to console logging.');
      console.log(`\n=== EMAIL TO: ${to} ===\nSUBJECT: ${subject}\nBODY: ${html}\n=======================\n`);
      return true; // Simulate success for dev
    }

    const transporter = nodemailer.createTransport(smtpUrl);
    
    await transporter.sendMail({
      from: '"FinNBiz Accounts" <noreply@finnbiz.in>',
      to,
      subject,
      html,
    });
    
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
