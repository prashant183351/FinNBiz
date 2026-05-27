import nodemailer from 'nodemailer';

// Helper service to send emails using Nodemailer and Brevo (or any SMTP)
export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('SMTP credentials are not configured in .env. Falling back to console logging.');
      console.log(`\n=== EMAIL TO: ${to} ===\nSUBJECT: ${subject}\nBODY: ${html}\n=======================\n`);
      return true; // Simulate success for dev
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
    
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
