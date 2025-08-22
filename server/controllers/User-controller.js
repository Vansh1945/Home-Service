const moment = require('moment');
const mongoose = require('mongoose');
const Booking = require('../models/Booking-model');
const Complaint = require('../models/Complaint-model');
const Transaction = require('../models/Transaction-model ');
const Coupon = require('../models/Coupon-model');
const User = require('../models/User-model');
const { sendOTP, verifyOTP } = require('../utils/otpSend');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadProfilePic } = require('../middlewares/upload'); // Assuming you have this configured
const path = require('path');
const fs = require('fs');

/**
 * Register a new user with OTP verification
 */
const register = async (req, res) => {
    try {
        const { name, email, phone, password, otp, address, profilePicUrl } = req.body;

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Check if user exists
        const userExists = await User.findOne({
            $or: [{ email }]
        });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "Email  already registered"
            });
        }

        // OTP handling
        if (!otp) {
            try {
                await sendOTP(email);
                return res.json({
                    success: true,
                    message: "OTP sent to email"
                });
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        }

        // Verify OTP
        try {
            verifyOTP(email, otp);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            address,
            profilePicUrl,
            role: 'customer'
        });

        // Generate JWT token
        const token = user.generateJWT();

        // Prepare response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            address: user.address,
            firstBookingUsed: user.firstBookingUsed,
            profilePicUrl: user.profilePicUrl,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: userResponse
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later."
        });
    }
}



/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -__v')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If profilePicUrl exists, make it a full URL
        if (user.profilePicUrl) {
            user.profilePicUrl = `${req.protocol}://${req.get('host')}/${user.profilePicUrl}`;
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Update user profile (text fields)
 */
const updateProfile = async (req, res) => {
    try {
        const updates = {
            name: req.body.name,
            phone: req.body.phone,
            address: req.body.address
        };

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password -__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (req, res) => {
    try {
        console.log('Upload request received'); // Debug log
        console.log('File:', req.file); // Debug log
        
        if (!req.file) {
            console.log('No file in request'); // Debug log
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Get the relative file path
        const relativePath = req.file.path.replace(/\\/g, '/');
        
        // Update user's profile picture URL
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicUrl: relativePath },
            { new: true }
        ).select('-password -__v');

        console.log('User before update:', user); // Debug log

        // Construct full URL for the response
        const fullUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

        console.log('Upload successful:', fullUrl); // Debug log
        
        res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profilePicUrl: fullUrl,
            user
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
}


/**
 * @desc    Get customer dashboard stats
 * @route   GET /api/customer/dashboard/stats
 * @access  Private (Customer)
 */
const getCustomerDashboardStats = async (req, res) => {
  try {
    const customerId = req.user._id; // Get customer ID from authenticated user
    
    // Set date ranges
    const today = moment().startOf('day');
    const currentWeek = moment().startOf('week');
    const currentMonth = moment().startOf('month');
    const currentYear = moment().startOf('year');

    // Parallelize all database queries for better performance
    const [
      totalBookings,
      todayBookings,
      weeklyBookings,
      monthlyBookings,
      yearlyBookings,
      bookingStatusStats,
      spendingStats,
      complaintStats,
      couponStats,
      recentBookings,
      favoriteServices,
      recentTransactions
    ] = await Promise.all([
      // Booking counts
      Booking.countDocuments({ customer: customerId }),
      Booking.countDocuments({ 
        customer: customerId,
        createdAt: { $gte: today.toDate() } 
      }),
      Booking.countDocuments({ 
        customer: customerId,
        createdAt: { $gte: currentWeek.toDate() } 
      }),
      Booking.countDocuments({ 
        customer: customerId,
        createdAt: { $gte: currentMonth.toDate() } 
      }),
      Booking.countDocuments({ 
        customer: customerId,
        createdAt: { $gte: currentYear.toDate() } 
      }),

      // Booking status distribution
      Booking.aggregate([
        { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Spending calculations
      Transaction.aggregate([
        { 
          $match: { 
            user: new mongoose.Types.ObjectId(customerId),
            paymentStatus: 'completed' 
          } 
        },
        { 
          $group: { 
            _id: null,
            totalSpent: { $sum: '$amount' },
            todaySpent: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', today.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            weeklySpent: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', currentWeek.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            monthlySpent: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', currentMonth.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            yearlySpent: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', currentYear.toDate()] },
                  '$amount',
                  0
                ]
              }
            }
          } 
        }
      ]),

      // Complaint statistics
      Complaint.aggregate([
        { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Coupon statistics
      Promise.all([
        Coupon.countDocuments({
          $or: [{ assignedTo: new mongoose.Types.ObjectId(customerId) }, { isGlobal: true }],
          isActive: true,
          expiryDate: { $gte: new Date() },
          "usedBy.user": { $ne: new mongoose.Types.ObjectId(customerId) }
        }),
        Coupon.countDocuments({
          "usedBy.user": new mongoose.Types.ObjectId(customerId)
        })
      ]),

      // Recent bookings (last 5)
      Booking.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('provider', 'name')
        .populate('services.service', 'title'),

      // Favorite services (most booked)
      Booking.aggregate([
        { 
          $match: { 
            customer: new mongoose.Types.ObjectId(customerId),
            status: { $in: ['completed', 'accepted'] }
          } 
        },
        { $unwind: '$services' },
        { $group: { _id: '$services.service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
        { 
          $lookup: { 
            from: 'services', 
            localField: '_id', 
            foreignField: '_id', 
            as: 'service' 
          } 
        },
        { $unwind: '$service' },
        { 
          $project: { 
            _id: 0, 
            serviceId: '$service._id',
            serviceName: '$service.title',
            category: '$service.category',
            count: 1 
          } 
        }
      ]),

      // Recent transactions (last 5)
      Transaction.find({ user: customerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('booking', 'services')
    ]);

    // Process the results
    const spending = spendingStats[0] || {
      totalSpent: 0,
      todaySpent: 0,
      weeklySpent: 0,
      monthlySpent: 0,
      yearlySpent: 0
    };

    const bookingStatusCounts = bookingStatusStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { pending: 0, accepted: 0, completed: 0, cancelled: 0 });

    const complaintStatusCounts = complaintStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { open: 0, resolved: 0 });

    // Prepare the response
    const dashboardStats = {
      overview: {
        totalBookings,
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        yearlyBookings,
        bookingStatus: bookingStatusCounts,
        totalSpent: spending.totalSpent,
        todaySpent: spending.todaySpent,
        weeklySpent: spending.weeklySpent,
        monthlySpent: spending.monthlySpent,
        yearlySpent: spending.yearlySpent,
        availableCoupons: couponStats[0],
        usedCoupons: couponStats[1]
      },
      complaints: complaintStatusCounts,
      recentBookings,
      favoriteServices,
      recentTransactions
    };

    res.json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    console.error('Error fetching customer dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};


module.exports = {
    register,
    getProfile,
    updateProfile,
    uploadProfilePicture,
    getCustomerDashboardStats
};

