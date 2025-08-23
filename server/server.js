require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cron = require('node-cron');
const crypto = require('crypto');
const connectDB = require("./config/db");
const Transaction = require("./models/Transaction-model ");

// Initialize express app
const app = express();

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], 
  credentials: true, // Allow credentials (cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Test Route 
app.get('/api/test-route', (req, res) => {
  res.send('Raj Electrical Service API is running!');
});

app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));



// Route imports
const adminRoutes = require("./routes/Admin-Routes");
const providerRoutes = require("./routes/Provider-Routes");
const customerRoutes = require("./routes/User-Routes");
const authRoutes = require("./routes/Auth-routes");
const questionRoutes = require("./routes/Question-route");
const testRoutes = require("./routes/Test-route");
const serviceRoutes = require("./routes/Service-route");
const couponRoutes = require("./routes/Coupon-route");
const bookingRoutes = require("./routes/Booking-route");
const transactionRoutes = require("./routes/Transaction-route");
const complaintRoutes = require("./routes/complaintRoutes");
const feedbackRoutes = require("./routes/feedback-routes");
const commissionRoutes = require('./routes/commissionRoutes');
const paymentRoutes = require('./routes/payment-routes');

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/test", testRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/booking", bookingRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/payment', paymentRoutes);



// Razorpay Webhook (localhost configuration)
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(body).event;
    if (event === 'payment.captured') {
      const payload = JSON.parse(body).payload.payment.entity;
      await Transaction.verifyPayment(payload.order_id, payload.id, signature);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Schedule weekly auto-withdrawals (localhost)
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('Running weekly auto-withdrawals...');
      await Transaction.processAutoWithdrawals();
    } catch (error) {
      console.error('Auto-withdrawal error:', error);
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message, err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});