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
/**
 * Validation helper functions
 */
const validateName = (name) => {
    if (!name || typeof name !== 'string') {
        return "Name is required";
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
        return "Name must be at least 2 characters long";
    }
    if (trimmedName.length > 50) {
        return "Name must not exceed 50 characters";
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
        return "Name can only contain letters and spaces";
    }
    return null;
};

const validateEmail = (email) => {
    if (!email || typeof email !== 'string') {
        return "Email is required";
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return "Please provide a valid email address";
    }
    return null;
};

const validatePhone = (phone) => {
    if (!phone || typeof phone !== 'string') {
        return "Phone number is required";
    }
    const trimmedPhone = phone.trim().replace(/\s+/g, '');
    // Indian mobile number validation (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
        return "Please provide a valid 10-digit Indian mobile number";
    }
    return null;
};

const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return "Password is required";
    }
    if (password.length < 8) {
        return "Password must be at least 8 characters long";
    }
    if (password.length > 128) {
        return "Password must not exceed 128 characters";
    }
    if (!/(?=.*[a-z])/.test(password)) {
        return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
        return "Password must contain at least one number";
    }
    return null;
};

const validateAddress = (address) => {
    const errors = {};
    
    if (!address || typeof address !== 'object') {
        return { address: "Address information is required" };
    }

    // Validate street
    if (!address.street || typeof address.street !== 'string') {
        errors['address.street'] = "Street address is required";
    } else if (address.street.trim().length < 5) {
        errors['address.street'] = "Street address must be at least 5 characters long";
    } else if (address.street.trim().length > 100) {
        errors['address.street'] = "Street address must not exceed 100 characters";
    }

    // Validate city
    if (!address.city || typeof address.city !== 'string') {
        errors['address.city'] = "City is required";
    } else if (address.city.trim().length < 2) {
        errors['address.city'] = "City must be at least 2 characters long";
    } else if (address.city.trim().length > 50) {
        errors['address.city'] = "City must not exceed 50 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(address.city.trim())) {
        errors['address.city'] = "City can only contain letters and spaces";
    }

    // Validate pincode
    if (!address.pincode || typeof address.pincode !== 'string') {
        errors['address.pincode'] = "Pincode is required";
    } else if (!/^\d{6}$/.test(address.pincode.trim())) {
        errors['address.pincode'] = "Pincode must be a valid 6-digit number";
    }

    return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Comprehensive validation function
 */
const validateRegistrationData = (data) => {
    const errors = {};

    // Validate individual fields
    const nameError = validateName(data.name);
    if (nameError) errors.name = nameError;

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    // Validate address if provided (required for final registration)
    if (data.address) {
        const addressErrors = validateAddress(data.address);
        if (addressErrors) {
            Object.assign(errors, addressErrors);
        }
    }

    return Object.keys(errors).length > 0 ? errors : null;
};

const register = async (req, res) => {
    try {
        const { name, email, phone, password, otp, address, profilePicUrl } = req.body;

        // Step 1: Validate basic registration data
        const validationErrors = validateRegistrationData({ name, email, phone, password, address });
        
        if (validationErrors) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Check if user already exists
        const userExists = await User.findOne({
            $or: [
                { email: email.trim().toLowerCase() },
                { phone: phone.trim().replace(/\s+/g, '') }
            ]
        });

        if (userExists) {
            const errors = {};
            if (userExists.email === email.trim().toLowerCase()) {
                errors.email = "Email is already registered";
            }
            if (userExists.phone === phone.trim().replace(/\s+/g, '')) {
                errors.phone = "Phone number is already registered";
            }
            
            return res.status(400).json({
                success: false,
                message: "User already exists",
                errors
            });
        }

        // Step 2: Handle OTP flow
        if (!otp) {
            // Send OTP for email verification
            try {
                await sendOTP(email.trim().toLowerCase());
                return res.json({
                    success: true,
                    message: "OTP sent to your email address"
                });
            } catch (error) {
                console.error("OTP sending error:", error);
                return res.status(400).json({
                    success: false,
                    message: "Failed to send OTP. Please try again.",
                    errors: { otp: "Unable to send verification code" }
                });
            }
        }

        // Step 3: Verify OTP and complete registration
        if (!address) {
            return res.status(400).json({
                success: false,
                message: "Address information is required for registration",
                errors: { address: "Complete address information is required" }
            });
        }

        try {
            verifyOTP(email.trim().toLowerCase(), otp);
        } catch (error) {
            console.error("OTP verification error:", error);
            return res.status(400).json({
                success: false,
                message: "OTP verification failed",
                errors: { otp: error.message || "Invalid or expired OTP" }
            });
        }

        // Create user with validated and sanitized data
        const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            phone: phone.trim().replace(/\s+/g, ''),
            address: {
                street: address.street.trim(),
                city: address.city.trim(),
                pincode: address.pincode.trim()
            },
            profilePicUrl,
            role: 'customer'
        };

        const user = await User.create(userData);

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
            message: "Registration completed successfully",
            token,
            user: userResponse
        });

    } catch (error) {
        console.error("Registration error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = {};
            Object.keys(error.errors).forEach(key => {
                errors[key] = error.errors[key].message;
            });
            
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const errors = {};
            errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is already registered`;
            
            return res.status(400).json({
                success: false,
                message: "User already exists",
                errors
            });
        }

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

