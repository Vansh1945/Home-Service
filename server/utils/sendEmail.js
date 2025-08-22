const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  try {
    // Verify environment variables
    if (!process.env.SENDER_EMAIL || !process.env.EMAIL_PASSWORD) {
      throw new Error('Missing email credentials in .env file');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Send mail
    const info = await transporter.sendMail({
      from: `"Raj Electrical Service" <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html
    });

    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

module.exports = sendEmail;