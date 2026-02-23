import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter with Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS, not SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use Gmail App Password or enable Less Secure Apps
  },
  logger: true, // Enable logging for debugging
  debug: true,  // Enable debug output
});

/**
 * Send OTP via email
 */
export async function sendOTPEmail(email, otp) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'ORBIT - Your One-Time Password (OTP)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">ORBIT Authentication</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666;">This OTP is valid for 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this OTP, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP sent successfully to ${email}:`, info.response);
    return { success: true, message: 'OTP sent to email' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send OTP to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetEmail(email, firstName = 'User') {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'ORBIT - Password Reset Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Successful</h2>
          <p>Hi ${firstName},</p>
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          <p style="color: #666;">If you did not request this reset, please contact support immediately.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Password reset email sent to ${email}:`, info.response);
    return { success: true, message: 'Confirmation email sent' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send password reset email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send approval workflow notification email
 */
export async function sendApprovalNotificationEmail({ to, subject, html, text }) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[EMAIL] Missing EMAIL_USER/EMAIL_PASSWORD, skipping notification send.');
      return { success: false, error: 'Email credentials not configured' };
    }

    if (!to || (Array.isArray(to) && to.length === 0)) {
      return { success: false, error: 'Recipient is required' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Approval notification sent to ${to}:`, info.response);
    return { success: true, message: 'Notification email sent' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send approval notification to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send onboarding email with employee ID and temporary password
 */
export async function sendNewUserCredentialsEmail({
  email,
  firstName = 'User',
  employeeId,
  temporaryPassword,
}) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[EMAIL] Missing EMAIL_USER/EMAIL_PASSWORD, skipping onboarding credentials email.');
      return { success: false, error: 'Email credentials not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'ORBIT - Your Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ORBIT</h2>
          <p>Hi ${firstName},</p>
          <p>Your ORBIT account has been created successfully.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #111827;"><strong>Employee ID:</strong> ${employeeId}</p>
            <p style="margin: 0; color: #111827;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          <p style="color: #4b5563;">Use your Employee ID when signing in.</p>
          <p style="color: #4b5563;">You will be required to change this password after first login.</p>
        </div>
      `,
      text: `Welcome to ORBIT. Your Employee ID is: ${employeeId}. Your temporary password is: ${temporaryPassword}. You will be required to change this on first login.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Onboarding credentials email sent to ${email}:`, info.response);
    return { success: true, message: 'Onboarding credentials email sent' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send onboarding credentials email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendAdminCredentialsCopyEmail({
  adminEmail,
  targetEmail,
  targetName = 'User',
  employeeId,
  temporaryPassword,
  action = 'created',
}) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[EMAIL] Missing EMAIL_USER/EMAIL_PASSWORD, skipping admin credentials copy email.');
      return { success: false, error: 'Email credentials not configured' };
    }

    if (!adminEmail) {
      return { success: false, error: 'Admin email not available' };
    }

    const safeAction = action === 'reset' ? 'reset' : 'created';
    const actionText = safeAction === 'reset' ? 'were reset' : 'was created';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: 'ORBIT - User Credentials Copy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">User Credentials Copy</h2>
          <p>The credentials for <strong>${targetName}</strong> (${targetEmail}) ${actionText}.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #111827;"><strong>Employee ID:</strong> ${employeeId}</p>
            <p style="margin: 0; color: #111827;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          <p style="color: #4b5563;">The user must log in with this temporary password and complete first-time setup.</p>
        </div>
      `,
      text: `Credentials copy for ${targetName} (${targetEmail}). Employee ID: ${employeeId}. Temporary Password: ${temporaryPassword}. The user must log in with this temporary password and complete first-time setup.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Admin credentials copy email sent to ${adminEmail}:`, info.response);
    return { success: true, message: 'Admin credentials copy email sent' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send admin credentials copy email to ${adminEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendAdminAccountCredentialsEmail({
  email,
  fullName = 'Admin',
  temporaryPassword,
}) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('[EMAIL] Missing EMAIL_USER/EMAIL_PASSWORD, skipping admin account credentials email.');
      return { success: false, error: 'Email credentials not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'ORBIT - Your Admin Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ORBIT Admin</h2>
          <p>Hi ${fullName},</p>
          <p>Your admin account has been configured.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #111827;"><strong>Login Email:</strong> ${email}</p>
            <p style="margin: 0; color: #111827;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          <p style="color: #4b5563;">Please use these credentials to log in to ORBIT.</p>
        </div>
      `,
      text: `Welcome to ORBIT Admin. Login Email: ${email}. Temporary Password: ${temporaryPassword}. Please use these credentials to log in to ORBIT.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Admin account credentials email sent to ${email}:`, info.response);
    return { success: true, message: 'Admin account credentials email sent' };
  } catch (error) {
    console.error(`[EMAIL] Failed to send admin account credentials email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

export default transporter;
