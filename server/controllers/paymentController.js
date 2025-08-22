// controllers/paymentController.js
const mongoose = require('mongoose');
const ProviderEarning = require('../models/ProviderEarning-model');
const PaymentRecord = require('../models/PaymentRecord-model');
const Provider = require('../models/Provider-model');
const Booking = require('../models/Booking-model');
const CommissionRule = require('../models/CommissionRule-model');
const { sendEmail } = require('../utils/sendEmail');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to format date
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Provider - Get earnings summary with commission breakdown
const getEarningsSummary = async (req, res) => {
  try {
    // Validate provider ID
    if (!mongoose.isValidObjectId(req.provider._id)) {
      return res.status(400).json({ success: false, error: 'Invalid provider ID format' });
    }

    const providerId = new mongoose.Types.ObjectId(req.provider._id);
    const providerType = req.provider.type;

    // Validate provider exists
    const provider = await Provider.findById(providerId).select('_id name type');
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Calculate date for last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get all data in parallel
    const [balance, summary, paymentHistory, commissionRule, lastMonthEarnings] = await Promise.all([
      // Available balance (earnings with 'available' status that are past availableAfter date)
      ProviderEarning.aggregate([
        { 
          $match: { 
            provider: providerId,
            status: 'available',
            availableAfter: { $lte: new Date() }
          } 
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      
      // Earnings summary by status
      ProviderEarning.aggregate([
        { 
          $match: { 
            provider: providerId
          } 
        },
        { 
          $group: { 
            _id: '$status',
            totalGross: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$commissionAmount' },
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 }
          } 
        }
      ]),
      
      // Payment history
      PaymentRecord.getProviderRecords(providerId, 1, 5),
      
      // Commission rule
      CommissionRule.findOne({
        providerType: providerType,
        isActive: true
      }).sort({ effectiveFrom: -1 }).select('commissionRate').lean(),
      
      // Last month earnings (created in the last 30 days)
      ProviderEarning.aggregate([
        { 
          $match: { 
            provider: providerId,
            createdAt: { $gte: lastMonth }
          } 
        },
        { 
          $group: { 
            _id: null,
            totalNet: { $sum: '$netAmount' }
          } 
        }
      ])
    ]);

    // Calculate available balance
    const availableBalance = balance.length > 0 ? balance[0].total : 0;

    // Calculate total earnings from last month
    const totalEarnings = lastMonthEarnings.length > 0 ? lastMonthEarnings[0].totalNet : 0;

    // Calculate pending earnings (earnings with 'available' status)
    let pendingEarnings = 0;
    if (summary && Array.isArray(summary)) {
      const availableEarnings = summary.find(item => item._id === 'available');
      pendingEarnings = availableEarnings ? availableEarnings.totalNet : 0;
    }

    // Calculate total withdrawn from payment records
    const withdrawnRecords = await PaymentRecord.find({
      provider: providerId,
      status: 'completed'
    }).select('netAmount').lean();

    const totalWithdrawn = withdrawnRecords.reduce((sum, record) => sum + (record.netAmount || 0), 0);

    res.json({
      success: true,
      availableBalance: availableBalance,
      totalEarnings: totalEarnings,
      pendingEarnings: pendingEarnings,
      totalWithdrawn: totalWithdrawn,
      commissionRate: commissionRule?.commissionRate 
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching earnings summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Provider - Request withdrawal
const requestWithdrawal = async (req, res) => {
  let session = null;

  try {
    const providerId = req.provider._id;
    const { amount, paymentMethod, paymentDetails } = req.body;

    console.log(`[WITHDRAWAL] Request from provider ${providerId} for ₹${amount}`);

    // 1. Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be positive number.'
      });
    }

    if (!paymentMethod || !['bank_transfer', 'upi'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Payment method required (bank_transfer / upi)'
      });
    }

    if (paymentMethod === 'bank_transfer') {
      if (!paymentDetails?.accountNumber || !paymentDetails?.accountName || !paymentDetails?.ifscCode) {
        return res.status(400).json({
          success: false,
          error: 'Bank transfer requires accountNumber, accountName, ifscCode'
        });
      }
    } else if (paymentMethod === 'upi') {
      if (!paymentDetails?.upiId) {
        return res.status(400).json({
          success: false,
          error: 'UPI requires upiId'
        });
      }
    }

    // 2. Check available balance with detailed logging
    const balance = await ProviderEarning.getAvailableBalance(providerId);
    console.log(`[WITHDRAWAL] Available balance for provider ${providerId}: ₹${balance}`);

    // Debug: Check all available earnings
    const availableEarnings = await ProviderEarning.find({
      provider: providerId,
      status: 'available',
      availableAfter: { $lte: new Date() }
    }).select('netAmount availableAfter createdAt booking').populate('booking', 'status');

    console.log(`[WITHDRAWAL] Found ${availableEarnings.length} available earnings:`);
    availableEarnings.forEach((earning, index) => {
      console.log(`[WITHDRAWAL] Earning ${index + 1}: ₹${earning.netAmount}, availableAfter: ${earning.availableAfter}, bookingStatus: ${earning.booking?.status}`);
    });

    if (amount > balance) {
      return res.status(400).json({
        success: false,
        error: `Requested ₹${amount} exceeds available balance ₹${balance}`
      });
    }

    // 3. Start transaction
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Create withdrawal payment record
      const paymentRecord = new PaymentRecord({
        provider: providerId,
        amount: amount,
        netAmount: amount,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        status: 'pending',
        transactionReference: `WDL-${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'withdrawal'
      });
      await paymentRecord.save({ session });

      console.log(`[WITHDRAWAL] Created payment record: ${paymentRecord.transactionReference}`);

      // Get available earnings that are ready for withdrawal
      const earnings = await ProviderEarning.find({
        provider: providerId,
        status: 'available',
        availableAfter: { $lte: new Date() }
      }).sort({ availableAfter: 1 }).session(session);

      console.log(`[WITHDRAWAL] Found ${earnings.length} earnings to process`);

      // Allocate earnings to this withdrawal
      let amountToAllocate = amount;
      const allocatedEarningIds = [];

      for (const earning of earnings) {
        if (amountToAllocate <= 0) break;

        const allocateAmount = Math.min(earning.netAmount, amountToAllocate);
        console.log(`[WITHDRAWAL] Allocating ₹${allocateAmount} from earning ${earning._id}`);
        
        // Update the earning record
        earning.netAmount -= allocateAmount;
        amountToAllocate -= allocateAmount;

        if (earning.netAmount === 0) {
          // If full amount is allocated, mark as processing and link to payment record
          earning.status = 'processing';
          earning.paymentRecord = paymentRecord._id;
          console.log(`[WITHDRAWAL] Full allocation - marked as processing`);
        } else {
          // If partial amount is allocated, create a new earning record for the allocated portion
          const partialEarning = new ProviderEarning({
            provider: providerId,
            booking: earning.booking,
            grossAmount: (allocateAmount / (earning.netAmount + allocateAmount)) * earning.grossAmount,
            commissionRate: earning.commissionRate,
            commissionAmount: (allocateAmount / (earning.netAmount + allocateAmount)) * earning.commissionAmount,
            netAmount: allocateAmount,
            status: 'processing',
            availableAfter: earning.availableAfter,
            paymentRecord: paymentRecord._id
          });
          await partialEarning.save({ session });
          allocatedEarningIds.push(partialEarning._id);
          console.log(`[WITHDRAWAL] Partial allocation - created new earning ${partialEarning._id}`);
        }

        await earning.save({ session });
        allocatedEarningIds.push(earning._id);
      }

      // Verify full amount was allocated
      if (amountToAllocate > 0) {
        throw new Error(`Could not allocate full withdrawal amount. Remaining: ₹${amountToAllocate}`);
      }

      // Update payment record with allocated earnings
      paymentRecord.allocatedEarnings = allocatedEarningIds;
      await paymentRecord.save({ session });

      console.log(`[WITHDRAWAL] Successfully allocated ₹${amount} to payment record`);

      req.paymentRecord = paymentRecord;
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        reference: req.paymentRecord.transactionReference,
        amount: req.paymentRecord.amount,
        status: req.paymentRecord.status,
        method: req.paymentRecord.paymentMethod,
        createdAt: req.paymentRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


// Provider - Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const { page = 1, limit = 10 } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    const [records, total] = await Promise.all([
      PaymentRecord.find({ provider: providerId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('amount netAmount createdAt status transactionReference paymentMethod type')
        .lean(),
      PaymentRecord.countDocuments({ provider: providerId })
    ]);

    // Format records for frontend
    const formattedRecords = records.map(record => ({
      id: record._id,
      type: record.type,
      amount: record.amount,
      netAmount: record.netAmount,
      date: record.createdAt,
      status: record.status,
      referenceId: record.transactionReference,
      paymentMethod: record.paymentMethod
    }));

    res.json({
      success: true,
      data: {
        payments: formattedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Provider - Get earnings by booking
const getEarningsByBooking = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }

    const earning = await ProviderEarning.findOne({
      provider: providerId,
      booking: bookingId
    })
      .populate({
        path: 'booking',
        select: 'services date totalPrice',
        populate: {
          path: 'services.service', // Correct path to populate services
          select: 'title'
        }
      })
      .select('grossAmount commissionRate commissionAmount netAmount status createdAt');

    if (!earning) {
      return res.status(404).json({
        success: false,
        error: 'No earnings found for this booking'
      });
    }

    // Get service names from the services array
    let serviceNames = 'N/A';
    if (earning.booking && earning.booking.services) {
      serviceNames = earning.booking.services
        .map(item => item.service?.title || 'Unknown Service')
        .join(', ');
    }

    // Format response
    const response = {
      bookingId: earning.booking._id,
      service: serviceNames,
      bookingDate: earning.booking.date,
      totalPrice: earning.booking.totalPrice,
      grossAmount: earning.grossAmount,
      commissionRate: earning.commissionRate,
      commissionAmount: earning.commissionAmount,
      netAmount: earning.netAmount,
      status: earning.status,
      earnedAt: earning.createdAt
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get earnings by booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking earnings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Provider - Download statement (PDF)
const downloadStatement = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const { startDate, endDate } = req.query;

    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start date' });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid end date' });
    }

    const match = { provider: providerId };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // Get provider details
    const provider = await Provider.findById(providerId).select('name email phone');
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Get data in parallel
    const [earnings, payments, summary] = await Promise.all([
      ProviderEarning.find(match)
        .sort({ createdAt: -1 })
        .populate({
          path: 'booking',
          select: 'services date totalPrice',
          populate: {
            path: 'services.service',
            select: 'title'
          }
        })
        .select('grossAmount commissionAmount netAmount status createdAt'),

      PaymentRecord.find({
        provider: providerId,
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { $gte: new Date(startDate) } : {}),
            ...(endDate ? { $lte: new Date(endDate) } : {})
          }
        } : {})
      })
        .sort({ createdAt: -1 })
        .select('amount netAmount createdAt status transactionReference paymentMethod'),

      ProviderEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$commissionAmount' },
            totalNet: { $sum: '$netAmount' }
          }
        }
      ])
    ]);

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `statement-${providerId}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add document content
    doc.fontSize(20).text('Provider Statement', { align: 'center' });
    doc.moveDown();

    // Provider info
    doc.fontSize(12).text(`Name: ${provider.name}`);
    doc.text(`Email: ${provider.email}`);
    doc.text(`Phone: ${provider.phone}`);
    doc.text(`Period: ${startDate ? formatDate(startDate) : 'All time'} - ${endDate ? formatDate(endDate) : 'Present'}`);
    doc.moveDown();

    // Earnings summary
    const earningsSummary = summary.length ? summary[0] : {
      totalGross: 0,
      totalCommission: 0,
      totalNet: 0
    };

    doc.fontSize(14).text('Earnings Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Earnings: ${earningsSummary.totalGross.toFixed(2)}`);
    doc.text(`Total Commission: ${earningsSummary.totalCommission.toFixed(2)}`);
    doc.text(`Net Earnings: ${earningsSummary.totalNet.toFixed(2)}`);
    doc.moveDown();

    // Earnings details
    doc.fontSize(14).text('Earnings Details', { underline: true });
    doc.fontSize(10);
    
    if (earnings.length === 0) {
      doc.text('No earnings found for the specified period');
    } else {
      doc.text('Date'.padEnd(12) + 'Service'.padEnd(25) + 'Amount'.padEnd(10) + 'Commission'.padEnd(12) + 'Net'.padEnd(10) + 'Status');
      doc.text('-'.repeat(80));
      
      earnings.forEach(earning => {
        let serviceNames = 'N/A';
        if (earning.booking && earning.booking.services) {
          serviceNames = earning.booking.services
            .map(item => item.service?.title || 'Unknown')
            .join(', ');
        }
        
        const serviceName = serviceNames.length > 20 ? serviceNames.substring(0, 20) + '...' : serviceNames;
        
        doc.text(
          formatDate(earning.createdAt).padEnd(12) +
          serviceName.padEnd(25) +
          `$${earning.grossAmount.toFixed(2)}`.padEnd(10) +
          `$${earning.commissionAmount.toFixed(2)}`.padEnd(12) +
          `$${earning.netAmount.toFixed(2)}`.padEnd(10) +
          earning.status
        );
      });
    }

    doc.moveDown();

    // Payment history
    doc.fontSize(14).text('Payment History', { underline: true });
    doc.fontSize(10);
    
    if (payments.length === 0) {
      doc.text('No payment records found for the specified period');
    } else {
      doc.text('Date'.padEnd(12) + 'Reference'.padEnd(20) + 'Amount'.padEnd(10) + 'Net'.padEnd(10) + 'Method'.padEnd(15) + 'Status');
      doc.text('-'.repeat(80));
      
      payments.forEach(payment => {
        doc.text(
          formatDate(payment.createdAt).padEnd(12) +
          (payment.transactionReference || 'N/A').padEnd(20) +
          `$${payment.amount.toFixed(2)}`.padEnd(10) +
          `$${payment.netAmount.toFixed(2)}`.padEnd(10) +
          (payment.paymentMethod || 'N/A').padEnd(15) +
          payment.status
        );
      });
    }

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, filename, (err) => {
        if (err) console.error('Error sending file:', err);
        // Clean up file after download
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error('Download PDF statement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF statement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Provider - Download statement (Excel)
const downloadStatementExcel = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const { startDate, endDate } = req.query;

    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start date' });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid end date' });
    }

    const match = { provider: providerId };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // Get provider details
    const provider = await Provider.findById(providerId).select('name email phone');
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Provider not found' });
    }

    // Get data in parallel
    const [earnings, payments, summary] = await Promise.all([
      ProviderEarning.find(match)
        .sort({ createdAt: -1 })
        .populate('booking', 'service')
        .select('grossAmount commissionAmount netAmount status createdAt'),

      PaymentRecord.find({
        provider: providerId,
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { $gte: new Date(startDate) } : {}),
            ...(endDate ? { $lte: new Date(endDate) } : {})
          }
        } : {})
      })
        .sort({ createdAt: -1 })
        .select('amount netAmount createdAt status transactionReference paymentMethod'),

      ProviderEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$grossAmount' },
            totalCommission: { $sum: '$commissionAmount' },
            totalNet: { $sum: '$netAmount' }
          }
        }
      ])
    ]);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Statement');

    // Add provider info
    worksheet.addRow(['Provider Statement']);
    worksheet.addRow(['Name:', provider.name]);
    worksheet.addRow(['Email:', provider.email]);
    worksheet.addRow(['Phone:', provider.phone]);
    worksheet.addRow(['Period:', `${startDate ? formatDate(startDate) : 'All time'} - ${endDate ? formatDate(endDate) : 'Present'}`]);
    worksheet.addRow([]);

    // Add earnings summary
    const earningsSummary = summary.length ? summary[0] : {
      totalGross: 0,
      totalCommission: 0,
      totalNet: 0
    };

    worksheet.addRow(['Earnings Summary']);
    worksheet.addRow(['Total Earnings:', `${earningsSummary.totalGross.toFixed(2)}`]);
    worksheet.addRow(['Total Commission:', `${earningsSummary.totalCommission.toFixed(2)}`]);
    worksheet.addRow(['Net Earnings:', `${earningsSummary.totalNet.toFixed(2)}`]);
    worksheet.addRow([]);

    // Add earnings details
    worksheet.addRow(['Earnings Details']);
    worksheet.addRow(['Date', 'Service', 'Amount', 'Commission', 'Net', 'Status']);

    earnings.forEach(earning => {
      worksheet.addRow([
        formatDate(earning.createdAt),
        earning.booking?.service || 'N/A',
        earning.grossAmount.toFixed(2),
        earning.commissionAmount.toFixed(2),
        earning.netAmount.toFixed(2),
        earning.status
      ]);
    });

    worksheet.addRow([]);

    // Add payment details
    worksheet.addRow(['Payment History']);
    worksheet.addRow(['Date', 'Reference', 'Amount', 'Net', 'Method', 'Status']);

    payments.forEach(payment => {
      worksheet.addRow([
        formatDate(payment.createdAt),
        payment.transactionReference,
        payment.amount.toFixed(2),
        payment.netAmount.toFixed(2),
        payment.paymentMethod,
        payment.status
      ]);
    });

    // Generate file
    const filename = `statement-${providerId}-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, filename, (err) => {
      if (err) console.error('Error sending file:', err);
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Download Excel statement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel statement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Get all provider earnings
const getAllProviderEarnings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, providerId } = req.query;

    // Validate pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (providerId) {
      if (!mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({ success: false, error: 'Invalid provider ID' });
      }
      filter.provider = providerId;
    }

    // Get data with pagination
    const [earnings, total] = await Promise.all([
      ProviderEarning.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('provider', 'name email')
        .populate('booking', 'service date')
        .populate('commissionRule', 'name type value')
        .select('grossAmount commissionAmount netAmount status createdAt'),
      ProviderEarning.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        earnings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get all provider earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider earnings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Process booking payment
const processBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking ID' });
    }

    // Get booking with necessary details
    const booking = await Booking.findById(bookingId)
      .populate('service', 'type title price')
      .populate('provider', '_id name email type');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Booking already paid'
      });
    }

    // Find applicable commission rule
    const commissionRule = await CommissionRule.findOne({
      $or: [
        { serviceType: booking.service.type },
        { providerType: booking.provider.type }
      ],
      isActive: true
    }).sort({ priority: 1 });

    // Calculate commission
    let commissionAmount = 0;
    if (commissionRule) {
      if (commissionRule.type === 'percentage') {
        commissionAmount = booking.totalPrice * (commissionRule.value / 100);
      } else {
        commissionAmount = commissionRule.value; // Fixed amount
      }
    } else {
      // Default commission if no rule found
      commissionAmount = booking.totalPrice * 0.1; // 10% default
    }

    // Create provider earning record
    const providerEarning = new ProviderEarning({
      provider: booking.provider._id,
      booking: booking._id,
      grossAmount: booking.totalPrice,
      commissionAmount,
      netAmount: booking.totalPrice - commissionAmount,
      status: 'pending', // Will become available after clearing period
      commissionRule: commissionRule?._id
    });

    await providerEarning.save();

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.paymentDate = new Date();
    await booking.save();

    // Notify provider
    await sendEmail({
      to: booking.provider.email,
      subject: 'New Earnings Added',
      text: `You have earned $${providerEarning.netAmount.toFixed(2)} from booking ${booking._id} for service ${booking.service.title}`
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: providerEarning
    });
  } catch (error) {
    console.error('Process booking payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process booking payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Get all withdrawal requests
const getAllWithdrawalRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Validate pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    // Build filter
    const filter = { type: 'withdrawal' };
    if (status) filter.status = status;

    // Get data with pagination
    const [requests, total] = await Promise.all([
      PaymentRecord.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('provider', 'name email')
        .select('amount netAmount createdAt status transactionReference paymentMethod'),
      PaymentRecord.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Process withdrawal
const processWithdrawal = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, transactionId } = req.body;

    // Validate input
    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "completed" or "rejected"'
      });
    }

    if (status === 'completed' && !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required for completed withdrawals'
      });
    }

    // Get payment record with provider details
    const paymentRecord = await PaymentRecord.findById(recordId)
      .populate('provider', 'name email');

    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    if (paymentRecord.type !== 'withdrawal') {
      return res.status(400).json({
        success: false,
        error: 'Not a withdrawal record'
      });
    }

    if (paymentRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal already processed'
      });
    }

    // Update payment record
    paymentRecord.status = status;
    if (transactionId) paymentRecord.transactionReference = transactionId;
    paymentRecord.processedAt = new Date();
    await paymentRecord.save();

    // Update associated earnings based on status
    if (status === 'completed') {
      await ProviderEarning.updateMany(
        { paymentRecord: recordId },
        { $set: { status: 'paid' } }
      );

      // Notify provider
      await sendEmail({
        to: paymentRecord.provider.email,
        subject: 'Withdrawal Processed',
        text: `Your withdrawal request of $${paymentRecord.amount.toFixed(2)} has been processed successfully. Transaction ID: ${transactionId}`
      });
    } else if (status === 'rejected') {
      await ProviderEarning.updateMany(
        { paymentRecord: recordId },
        { $set: { status: 'available', paymentRecord: null } }
      );

      // Notify provider
      await sendEmail({
        to: paymentRecord.provider.email,
        subject: 'Withdrawal Rejected',
        text: `Your withdrawal request of $${paymentRecord.amount.toFixed(2)} has been rejected. Please contact support for more information.`
      });
    }

    res.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      data: paymentRecord
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Generate report (PDF)
const generateReport = async (req, res) => {
  try {
    const { providerId, startDate, endDate, reportType } = req.query;

    // Validate provider ID if provided
    if (providerId && !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, error: 'Invalid provider ID' });
    }

    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start date' });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid end date' });
    }

    // Build match query
    const match = providerId ? { provider: mongoose.Types.ObjectId(providerId) } : {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // Set report title
    let title = 'Admin Earnings Report';
    let providerName = '';

    if (providerId) {
      const provider = await Provider.findById(providerId).select('name');
      providerName = provider?.name || '';
      title = `Earnings Report for ${providerName}`;
    }

    // Create PDF document
    const doc = new PDFDocument();
    const filename = `earnings-report-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add document content
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Report info
    doc.fontSize(12).text(`Report Type: ${reportType || 'General Earnings'}`);
    if (providerName) doc.text(`Provider: ${providerName}`);
    doc.text(`Period: ${startDate ? formatDate(startDate) : 'All time'} - ${endDate ? formatDate(endDate) : 'Present'}`);
    doc.moveDown();

    // Summary statistics
    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.moveDown();

    const stats = await ProviderEarning.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalNet: { $sum: '$netAmount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          availableCount: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = stats.length ? stats[0] : {
      totalGross: 0,
      totalCommission: 0,
      totalNet: 0,
      pendingCount: 0,
      availableCount: 0,
      paidCount: 0
    };

    doc.text(`Total Earnings: $${summary.totalGross.toFixed(2)}`);
    doc.text(`Total Commission: $${summary.totalCommission.toFixed(2)}`);
    doc.text(`Net Paid to Providers: $${summary.totalNet.toFixed(2)}`);
    doc.moveDown();
    doc.text(`Pending Earnings: ${summary.pendingCount}`);
    doc.text(`Available for Withdrawal: ${summary.availableCount}`);
    doc.text(`Paid Earnings: ${summary.paidCount}`);
    doc.moveDown();

    // Top providers (only if not filtered by provider)
    if (!providerId) {
      doc.fontSize(14).text('Top Providers by Earnings', { underline: true });
      doc.moveDown();

      const topProviders = await ProviderEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$provider',
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalNet: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'providers',
            localField: '_id',
            foreignField: '_id',
            as: 'provider'
          }
        },
        { $unwind: '$provider' }
      ]);

      if (topProviders.length === 0) {
        doc.text('No provider data available');
      } else {
        topProviders.forEach((provider, index) => {
          doc.text(`${index + 1}. ${provider.provider.name}`);
          doc.text(`   Earnings: $${provider.totalNet.toFixed(2)} (${provider.count} bookings)`);
          doc.moveDown(0.5);
        });
      }

      doc.moveDown();
    }

    // Recent payments
    doc.fontSize(14).text('Recent Payments', { underline: true });
    doc.moveDown();

    const paymentFilter = providerId ? { provider: providerId } : {};
    if (startDate || endDate) {
      paymentFilter.createdAt = {};
      if (startDate) paymentFilter.createdAt.$gte = new Date(startDate);
      if (endDate) paymentFilter.createdAt.$lte = new Date(endDate);
    }

    const payments = await PaymentRecord.find(paymentFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('provider', 'name');

    if (payments.length === 0) {
      doc.text('No payment records found');
    } else {
      payments.forEach((payment, index) => {
        doc.text(`#${index + 1}: ${formatDate(payment.createdAt)} - ${payment.provider?.name || 'N/A'}`);
        doc.text(`   Amount: $${payment.amount.toFixed(2)}`);
        doc.text(`   Net: $${payment.netAmount.toFixed(2)}`);
        doc.text(`   Method: ${payment.paymentMethod} - Status: ${payment.status}`);
        doc.moveDown(0.5);
      });
    }

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, filename, (err) => {
        if (err) console.error('Error sending file:', err);
        // Clean up file after download
        fs.unlinkSync(filePath);
      });
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Get top providers
const getTopProviders = async (req, res) => {
  try {
    const { limit = 5, period = 'month' } = req.query;

    // Validate limit
    const limitNum = parseInt(limit) || 5;
    if (limitNum < 1 || limitNum > 20) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 20'
      });
    }

    // Set date filter based on period
    let dateFilter = {};
    const now = new Date();

    if (period === 'week') {
      dateFilter.$gte = new Date(now.setDate(now.getDate() - 7));
    } else if (period === 'month') {
      dateFilter.$gte = new Date(now.setMonth(now.getMonth() - 1));
    } else if (period === 'year') {
      dateFilter.$gte = new Date(now.setFullYear(now.getFullYear() - 1));
    } else if (period !== 'all') {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be week, month, year, or all'
      });
    }

    // Get top providers
    const topProviders = await ProviderEarning.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: '$provider',
          totalEarnings: { $sum: '$netAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'providers',
          localField: '_id',
          foreignField: '_id',
          as: 'provider'
        }
      },
      { $unwind: '$provider' },
      {
        $project: {
          providerId: '$_id',
          name: '$provider.name',
          email: '$provider.email',
          totalEarnings: 1,
          bookingCount: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: topProviders,
      period,
      limit: limitNum
    });
  } catch (error) {
    console.error('Get top providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top providers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin - Generate report (Excel)
const generateReportExcel = async (req, res) => {
  try {
    const { providerId, startDate, endDate, reportType } = req.query;

    // Validate provider ID if provided
    if (providerId && !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, error: 'Invalid provider ID' });
    }

    // Validate dates if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start date' });
    }

    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid end date' });
    }

    // Build match query
    const match = providerId ? { provider: mongoose.Types.ObjectId(providerId) } : {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // Set report title
    let title = 'Admin Earnings Report';
    let providerName = '';

    if (providerId) {
      const provider = await Provider.findById(providerId).select('name');
      providerName = provider?.name || '';
      title = `Earnings Report for ${providerName}`;
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add report info
    worksheet.addRow([title]);
    if (providerName) worksheet.addRow(['Provider:', providerName]);
    worksheet.addRow(['Report Type:', reportType || 'General Earnings']);
    worksheet.addRow(['Period:', `${startDate ? formatDate(startDate) : 'All time'} - ${endDate ? formatDate(endDate) : 'Present'}`]);
    worksheet.addRow([]);

    // Add summary statistics
    worksheet.addRow(['Summary Statistics']);

    const stats = await ProviderEarning.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalNet: { $sum: '$netAmount' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          availableCount: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          }
        }
      }
    ]);

    const summary = stats.length ? stats[0] : {
      totalGross: 0,
      totalCommission: 0,
      totalNet: 0,
      pendingCount: 0,
      availableCount: 0,
      paidCount: 0
    };

    worksheet.addRow(['Total Earnings:', `$${summary.totalGross.toFixed(2)}`]);
    worksheet.addRow(['Total Commission:', `$${summary.totalCommission.toFixed(2)}`]);
    worksheet.addRow(['Net Paid to Providers:', `$${summary.totalNet.toFixed(2)}`]);
    worksheet.addRow([]);
    worksheet.addRow(['Pending Earnings:', summary.pendingCount]);
    worksheet.addRow(['Available for Withdrawal:', summary.availableCount]);
    worksheet.addRow(['Paid Earnings:', summary.paidCount]);
    worksheet.addRow([]);

    // Add top providers (only if not filtered by provider)
    if (!providerId) {
      worksheet.addRow(['Top Providers by Earnings']);
      worksheet.addRow(['Rank', 'Name', 'Earnings', 'Bookings']);

      const topProviders = await ProviderEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$provider',
            totalNet: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalNet: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'providers',
            localField: '_id',
            foreignField: '_id',
            as: 'provider'
          }
        },
        { $unwind: '$provider' }
      ]);

      topProviders.forEach((provider, index) => {
        worksheet.addRow([
          index + 1,
          provider.provider.name,
          provider.totalNet.toFixed(2),
          provider.count
        ]);
      });

      worksheet.addRow([]);
    }

    // Add recent payments
    worksheet.addRow(['Recent Payments']);
    worksheet.addRow(['Date', 'Provider', 'Amount', 'Net', 'Method', 'Status']);

    const paymentFilter = providerId ? { provider: providerId } : {};
    if (startDate || endDate) {
      paymentFilter.createdAt = {};
      if (startDate) paymentFilter.createdAt.$gte = new Date(startDate);
      if (endDate) paymentFilter.createdAt.$lte = new Date(endDate);
    }

    const payments = await PaymentRecord.find(paymentFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('provider', 'name');

    payments.forEach(payment => {
      worksheet.addRow([
        formatDate(payment.createdAt),
        payment.provider?.name || 'N/A',
        payment.amount.toFixed(2),
        payment.netAmount.toFixed(2),
        payment.paymentMethod,
        payment.status
      ]);
    });

    // Generate file
    const filename = `earnings-report-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../temp', filename);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, filename, (err) => {
      if (err) console.error('Error sending file:', err);
      // Clean up file after download
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Generate Excel report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Provider - Get earnings list (for earnings tab)
const getProviderEarnings = async (req, res) => {
  try {
    const providerId = req.provider._id;
    const { from, to, page = 1, limit = 10 } = req.query;

    // Validate pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters'
      });
    }

    // Validate dates if provided
    if (from && isNaN(new Date(from).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid from date' });
    }

    if (to && isNaN(new Date(to).getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid to date' });
    }

    // Build match query
    const match = { provider: providerId };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    // Get earnings with pagination
    const [earnings, total] = await Promise.all([
      ProviderEarning.find(match)
        .populate({
          path: 'booking',
          select: 'services date totalPrice',
          populate: {
            path: 'services.service', // Correct path to populate services
            select: 'title'
          }
        })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('grossAmount commissionAmount netAmount status createdAt'),
      ProviderEarning.countDocuments(match)
    ]);

    // Format earnings for frontend
    const formattedEarnings = earnings.map(earning => {
      // Get service names from the services array
      let serviceNames = 'N/A';
      if (earning.booking && earning.booking.services) {
        serviceNames = earning.booking.services
          .map(item => item.service?.title || 'Unknown Service')
          .join(', ');
      }

      return {
        id: earning._id,
        bookingId: earning.booking?._id?.toString().slice(-8) || 'N/A',
        date: earning.createdAt,
        serviceName: serviceNames,
        bookingDate: earning.booking?.date || null,
        grossAmount: earning.grossAmount,
        commission: earning.commissionAmount,
        netAmount: earning.netAmount,
        status: earning.status
      };
    });

    res.json({
      success: true,
      data: {
        earnings: formattedEarnings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Get provider earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



module.exports = {
  getEarningsSummary,
  requestWithdrawal,
  getPaymentHistory,
  getEarningsByBooking,
  downloadStatement,
  downloadStatementExcel,
  getAllProviderEarnings,
  processBookingPayment,
  getAllWithdrawalRequests,
  processWithdrawal,
  generateReport,
  getTopProviders,
  generateReportExcel,
  getProviderEarnings
};
