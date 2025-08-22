const nodemailer = require("nodemailer");
const crypto = require("crypto");

// In-memory OTP store (for production, use Redis)
const otpStore = new Map();

// Cleanup expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);

exports.generateOTP = (email) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 300000; // 5 minutes

  otpStore.set(email, {
    otp,
    expiresAt,
    attempts: 0 // Track verification attempts
  });

  return otp;
};

exports.sendOTP = async (email) => {
  try {
    // Clear any existing OTP for this email
    if (otpStore.has(email)) {
      otpStore.delete(email);
    }

    const otp = exports.generateOTP(email);

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      // For better error handling
      pool: true,
      maxConnections: 1,
      rateDelta: 20000,
      rateLimit: 5
    });

    const mailOptions = {
      from: `"Raj Electrical Service" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${otp}\nThis code is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">OTP Service</h2>
          <p>Your verification code is:</p>
          <h1 style="background: #f3f4f6; display: inline-block; padding: 10px 20px; border-radius: 4px; letter-spacing: 2px;">
            ${otp}
          </h1>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #6b7280; font-size: 0.9em;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

exports.verifyOTP = (email, otp) => {
  const storedData = otpStore.get(email);

  if (!storedData) {
    throw new Error("OTP not found or expired");
  }

  // Increment attempt counter
  storedData.attempts++;
  otpStore.set(email, storedData);

  if (storedData.attempts > 3) {
    otpStore.delete(email);
    throw new Error("Too many attempts. OTP invalidated.");
  }

  if (storedData.expiresAt < Date.now()) {
    otpStore.delete(email);
    throw new Error("OTP expired");
  }

  if (storedData.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  // Clear OTP after successful verification
  otpStore.delete(email);
  return true;
};

// Additional utility functions
exports.hasActiveOTP = (email) => {
  return otpStore.has(email);
};

exports.clearOTP = (email) => {
  otpStore.delete(email);
};