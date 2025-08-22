const Complaint = require('../models/Complaint-model');
const Booking = require('../models/Booking-model');
const User = require('../models/User-model');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs = require('fs');

const submitComplaint = async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    const customerId = req.user._id;

    if (!bookingId || !message) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Booking ID and message are required'
      });
    }

    // Populate booking details including services and customer info
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId
    })
    .populate('provider', 'name email phone')
    .populate('customer', 'name email phone')
    .populate('services.service', 'title description');

    if (!booking) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Booking not found or unauthorized'
      });
    }

    const existingComplaint = await Complaint.findOne({ booking: bookingId });
    if (existingComplaint) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'A complaint already exists for this booking'
      });
    }

    const complaintData = {
      customer: customerId,
      provider: booking.provider._id,
      booking: bookingId,
      message,
      status: 'open'
    };

    if (req.file) {
      complaintData.imageProof = req.file.path;
    }

    const complaint = await Complaint.create(complaintData);
    
    // Update booking with complaint reference
    booking.complaint = complaint._id;
    await booking.save();

    // Prepare response with all necessary populated data
    const responseComplaint = await Complaint.findById(complaint._id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone')
      .lean();

    responseComplaint.bookingDetails = {
      _id: booking._id,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      services: booking.services.map(service => ({
        title: service.service?.title || 'Service not found',
        description: service.service?.description || '',
        quantity: service.quantity,
        price: service.price
      })),
      totalAmount: booking.totalAmount
    };

    if (complaint.imageProof) {
      responseComplaint.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
    }

    return res.status(201).json({
      success: true,
      complaint: responseComplaint
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Error submitting complaint:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting complaint'
    });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate({
        path: 'customer',
        select: 'name phone email'
      })
      .populate({
        path: 'provider',
        select: 'name phone email'
      })
      .populate({
        path: 'booking',
        select: 'date time status totalAmount services serviceType address',
        populate: {
          path: 'services.service',
          model: 'Service',
          select: 'name description price'
        }
      })
      .sort({ createdAt: -1 });

    const complaintsWithDetails = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      
      // Format booking details
      if (complaint.booking) {
        complaintObj.bookingDetails = {
          _id: complaint.booking._id,
          date: complaint.booking.date,
          time: complaint.booking.time,
          status: complaint.booking.status,
          serviceType: complaint.booking.serviceType,
          address: complaint.booking.address,
          services: complaint.booking.services?.map(serviceItem => ({
            name: serviceItem.service?.name || 'Service not found',
            description: serviceItem.service?.description || '',
            quantity: serviceItem.quantity,
            price: serviceItem.price
          })) || [],
          totalAmount: complaint.booking.totalAmount
        };
      }

      if (complaint.imageProof) {
        complaintObj.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
      }
      return complaintObj;
    });

    return res.json({
      success: true,
      count: complaints.length,
      complaints: complaintsWithDetails
    });
  } catch (error) {
    console.error('Error getting all complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching complaints'
    });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {};
    if (userRole === 'customer') {
      query.customer = userId;
    } else if (userRole === 'provider') {
      query.provider = userId;
    }

    const complaints = await Complaint.find(query)
      .populate({
        path: userRole === 'customer' ? 'provider' : 'customer',
        select: 'name phone email'
      })
      .populate({
        path: 'booking',
        select: 'date time status totalAmount',
        populate: {
          path: 'services.service',
          select: 'title description'
        }
      })
      .sort({ createdAt: -1 });

    const complaintsWithDetails = complaints.map(complaint => {
      const complaintObj = complaint.toObject();
      
      // Add formatted booking details
      if (complaint.booking) {
        complaintObj.bookingDetails = {
          _id: complaint.booking._id,
          date: complaint.booking.date,
          time: complaint.booking.time,
          status: complaint.booking.status,
          services: complaint.booking.services.map(service => ({
            title: service.service?.title || 'Service not found',
            description: service.service?.description || '',
            quantity: service.quantity,
            price: service.price
          })),
          totalAmount: complaint.booking.totalAmount
        };
      }

      if (complaint.imageProof) {
        complaintObj.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
      }
      return complaintObj;
    });

    return res.json({
      success: true,
      count: complaints.length,
      complaints: complaintsWithDetails
    });
  } catch (error) {
    console.error('Error getting user complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching user complaints'
    });
  }
};

const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate({
        path: 'customer',
        select: 'name phone email'
      })
      .populate({
        path: 'provider',
        select: 'name phone email'
      })
      .populate({
        path: 'booking',
        select: 'date time status totalAmount paymentStatus',
        populate: {
          path: 'services.service',
          select: 'title description'
        }
      });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const isCustomer = req.user.role === 'customer' && complaint.customer._id.equals(req.user._id);
    const isProvider = req.user.role === 'provider' && complaint.provider._id.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    const complaintWithDetails = complaint.toObject();
    
    // Add detailed booking information
    if (complaint.booking) {
      complaintWithDetails.bookingDetails = {
        _id: complaint.booking._id,
        date: complaint.booking.date,
        time: complaint.booking.time,
        status: complaint.booking.status,
        paymentStatus: complaint.booking.paymentStatus,
        services: complaint.booking.services.map(service => ({
          title: service.service?.title || 'Service not found',
          description: service.service?.description || '',
          quantity: service.quantity,
          price: service.price
        })),
        totalAmount: complaint.booking.totalAmount
      };
    }

    if (complaint.imageProof) {
      complaintWithDetails.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
    }

    return res.json({
      success: true,
      complaint: complaintWithDetails
    });
  } catch (error) {
    console.error('Error getting complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching complaint'
    });
  }
};

const resolveComplaint = async (req, res) => {
  try {
    const { response } = req.body;
    const complaint = await Complaint.findById(req.params.id)
      .populate('customer', 'email name')
      .populate('provider', 'email name')
      .populate({
        path: 'booking',
        select: '_id date time totalAmount'
      });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (complaint.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Complaint is already resolved'
      });
    }

    complaint.status = 'resolved';
    complaint.adminResponse = response;
    complaint.resolvedAt = new Date();
    await complaint.save();

    // Prepare response with booking details
    const responseComplaint = complaint.toObject();
    if (complaint.booking) {
      responseComplaint.bookingDetails = {
        _id: complaint.booking._id,
        date: complaint.booking.date,
        time: complaint.booking.time,
        totalAmount: complaint.booking.totalAmount
      };
    }

    if (complaint.imageProof) {
      responseComplaint.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
    }

    // Send email to customer
    try {
      await sendEmail({
        to: complaint.customer.email,
        subject: 'Your Complaint Has Been Resolved',
        html: `
          <h2>Dear ${complaint.customer.name},</h2>
          <p>Your complaint regarding booking ${complaint.booking._id} has been resolved by our team.</p>
          <p><strong>Booking Date:</strong> ${new Date(complaint.booking.date).toLocaleDateString()}</p>
          <p><strong>Admin Response:</strong> ${response}</p>
          <p>If you have any further questions, please don't hesitate to contact us.</p>
          <p>Best regards,</p>
          <p>Customer Support Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send resolution email to customer:', emailError);
    }

    // Send email to provider
    try {
      await sendEmail({
        to: complaint.provider.email,
        subject: 'Complaint Resolution Notification',
        html: `
          <h2>Dear ${complaint.provider.name},</h2>
          <p>A complaint against your service (Booking ${complaint.booking._id}) has been resolved by our admin team.</p>
          <p><strong>Booking Date:</strong> ${new Date(complaint.booking.date).toLocaleDateString()}</p>
          <p><strong>Admin Response:</strong> ${response}</p>
          <p>Please review this resolution and ensure better service quality in future.</p>
          <p>Best regards,</p>
          <p>Customer Support Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send resolution email to provider:', emailError);
    }

    return res.json({
      success: true,
      message: 'Complaint resolved successfully and notifications sent',
      complaint: responseComplaint
    });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resolving complaint'
    });
  }
};

const reopenComplaint = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for reopening complaint'
      });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('customer', 'email name')
      .populate('provider', 'email name')
      .populate({
        path: 'booking',
        select: '_id date time'
      });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (!complaint.customer._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reopen this complaint'
      });
    }

    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Only resolved complaints can be reopened'
      });
    }

    complaint.status = 'open';
    complaint.reopenReason = reason;
    complaint.reopenedAt = new Date();
    await complaint.save();

    // Prepare response with booking details
    const responseComplaint = complaint.toObject();
    if (complaint.booking) {
      responseComplaint.bookingDetails = {
        _id: complaint.booking._id,
        date: complaint.booking.date,
        time: complaint.booking.time
      };
    }

    if (complaint.imageProof) {
      responseComplaint.imageProof = `${req.protocol}://${req.get('host')}/${complaint.imageProof}`;
    }

    // Send email notification about reopening
    try {
      await sendEmail({
        to: complaint.provider.email,
        subject: 'Complaint Reopened Notification',
        html: `
          <h2>Dear ${complaint.provider.name},</h2>
          <p>The complaint regarding booking ${complaint.booking._id} has been reopened by the customer.</p>
          <p><strong>Booking Date:</strong> ${new Date(complaint.booking.date).toLocaleDateString()}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please review this matter and contact support if needed.</p>
          <p>Best regards,</p>
          <p>Customer Support Team</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send reopening email:', emailError);
    }

    return res.json({
      success: true,
      message: 'Complaint reopened successfully',
      complaint: responseComplaint
    });
  } catch (error) {
    console.error('Error reopening complaint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while reopening complaint'
    });
  }
};

module.exports = {
  submitComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaint,
  resolveComplaint,
  reopenComplaint
};