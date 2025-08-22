const Admin = require('../models/Admin-model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Provider = require('../models/Provider-model');
const User = require('../models/User-model')
const sendEmail = require('../utils/sendEmail');
const Booking = require('../models/Booking-model');
const Service = require('../models/Service-model');
const Complaint = require('../models/Complaint-model');
const Transaction = require('../models/Transaction-model ');
const Coupon = require('../models/Coupon-model');
const ProviderEarning = require('../models/ProviderEarning-model');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

/**
 * Register a new admin
 */
const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        // Check if admin exists
        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Admin already exists with this email'
            });
        }

        // Create new admin
        const admin = await Admin.create({
            name,
            email,
            password
        });

        // Generate JWT token
        const token = admin.generateJWT();

        // Prepare response data (excluding password)
        const adminData = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            isAdmin: admin.isAdmin,
            createdAt: admin.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            token,
            admin: adminData
        });

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};




/**
 * Get admin profile (protected route)
 */
const getAdminProfile = async (req, res) => {
    try {
        // Admin data is already attached to req by the auth middleware
        const admin = req.admin;

        // Prepare response data
        const adminData = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            isAdmin: admin.isAdmin,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt
        };

        res.status(200).json({
            success: true,
            admin: adminData
        });

    } catch (error) {
        console.error('Get admin profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile'
        });
    }
};

// Get all Customers
const getAllCustomers = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search and filter
        const search = req.query.search || '';
        const filter = {
            role: 'customer',
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const customers = await User.find(filter)
            .select('-password -__v')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: customers.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            customers
        });

    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching customers'
        });
    }
};



/**
 * @desc    Approve or reject provider account with remarks
 * @route   PUT /api/admin/providers/:id/status
 * @access  Private (Admin)
 */
const approveProvider = async (req, res) => {
    try {
        const providerId = req.params.id;
        const { status, remarks } = req.body;

        // Validate input
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "approved" or "rejected"'
            });
        }

        // Find provider with all required fields
        const provider = await Provider.findById(providerId)
            .select('+password +bankDetails.passbookImage +bankDetails.accountNo +bankDetails.ifsc');
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Handle approval
        if (status === 'approved') {
            // Verify all required fields are present
            const requiredFields = [
                provider.name,
                provider.email,
                provider.phone,
                provider.dateOfBirth,
                provider.services,
                provider.experience,
                provider.profilePicUrl,
                provider.resume,
                provider.bankDetails?.accountNo,
                provider.bankDetails?.ifsc,
                provider.bankDetails?.passbookImage
            ];

            if (requiredFields.some(field => !field)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot approve provider with missing required fields'
                });
            }

            // Update provider status
            provider.bankDetails.verified = true;
            provider.approved = true;
            provider.kycStatus = 'approved';
            provider.rejectionReason = '';
            provider.isActive = true;
            provider.profileComplete = true;

            // Save with validation (since all required fields exist)
            await provider.save();

            // Send approval email
            try {
                const emailTemplate = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Account Approved</h2>
                        <p>Dear ${provider.name},</p>
                        <p>Congratulations! Your provider account has been approved.</p>
                        ${remarks ? `<p><strong>Admin Remarks:</strong> ${remarks}</p>` : ''}
                        <p>You can now login and start accepting service requests.</p>
                        <p style="margin-top: 30px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/provider/dashboard" 
                               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                                Go to Dashboard
                            </a>
                        </p>
                    </div>
                `;

                await sendEmail({
                    to: provider.email,
                    subject: 'Your Provider Account Has Been Approved',
                    html: emailTemplate
                });

                return res.status(200).json({
                    success: true,
                    message: 'Provider approved successfully. Notification email sent.',
                    provider: provider.toObject({ getters: true, virtuals: true })
                });

            } catch (emailError) {
                console.error('Failed to send approval email:', emailError);
                return res.status(200).json({
                    success: true,
                    message: 'Provider approved but failed to send email',
                    provider: provider.toObject({ getters: true, virtuals: true })
                });
            }
        }

        // Handle rejection
        if (status === 'rejected') {
            provider.bankDetails.verified = false;
            provider.approved = false;
            provider.kycStatus = 'rejected';
            provider.rejectionReason = remarks || 'No reason provided';
            provider.isActive = false;
            provider.testPassed = false;
            provider.isDeleted = true;

            // Save with validation disabled (since we're rejecting)
            await provider.save({ validateBeforeSave: false });

            // Send rejection email
            try {
                const emailTemplate = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">Account Rejected</h2>
                        <p>Dear ${provider.name},</p>
                        <p>We regret to inform you that your provider account has been rejected.</p>
                        <p><strong>Reason:</strong> ${provider.rejectionReason}</p>
                        <p>All your data will be permanently deleted from our systems.</p>
                        <p>If you believe this is an error, please contact our support team.</p>
                        <p style="margin-top: 30px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact" 
                               style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                                Contact Support
                            </a>
                        </p>
                    </div>
                `;

                await sendEmail({
                    to: provider.email,
                    subject: 'Your Provider Account Has Been Rejected',
                    html: emailTemplate
                });
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError);
            }

            // Schedule actual deletion
            setTimeout(async () => {
                try {
                    await Provider.findByIdAndDelete(providerId);
                    console.log(`Provider ${providerId} deleted after rejection`);
                } catch (deleteError) {
                    console.error('Error deleting rejected provider:', deleteError);
                }
            }, 1000);

            return res.status(200).json({
                success: true,
                message: 'Provider rejected and marked for deletion',
                provider: provider.toObject({ getters: true, virtuals: true })
            });
        }

    } catch (error) {
        console.error('Update provider status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating provider status',
            error: error.message
        });
    }
};

/**
 * @desc    Get pending providers
 * @route   GET /api/admin/providers/pending
 * @access  Private (Admin)
 */
const getPendingProviders = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search filter
        const search = req.query.search || '';

        const query = {
            approved: false,
            isDeleted: false,
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { serviceArea: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const providers = await Provider.find(query)
            .select('-password -__v')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Provider.countDocuments(query);

        res.status(200).json({
            success: true,
            count: providers.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            providers
        });
    } catch (error) {
        console.error('Get pending providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching pending providers'
        });
    }
};

/**
 * @desc    Get all providers
 * @route   GET /api/admin/providers
 * @access  Private (Admin)
 */
const getAllProviders = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search and filter
        const search = req.query.search || '';
        const status = req.query.status || 'all'; // all, approved, pending, rejected
        const service = req.query.service || '';

        const filter = {
            isDeleted: false,
            ...(status === 'approved' && { approved: true, kycStatus: 'approved' }),
            ...(status === 'pending' && { approved: false, kycStatus: 'pending' }),
            ...(status === 'rejected' && { kycStatus: 'rejected' }),
            ...(service && { services: service }),
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { serviceArea: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const providers = await Provider.find(filter)
            .select('-password -__v')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Provider.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: providers.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            providers
        });

    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching providers'
        });
    }
};

/**
 * @desc    Get single provider details with all documents
 * @route   GET /api/admin/providers/:id
 * @access  Private (Admin)
 */
const getProviderDetails = async (req, res) => {
    try {
        const providerId = req.params.id;

        // Find provider with all details except password
        const provider = await Provider.findById(providerId)
            .select('-password -__v');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Prepare response with document URLs
        const response = {
            ...provider.toObject(),
            documents: {
                profilePicUrl: provider.profilePicUrl 
                    ? `${req.protocol}://${req.get('host')}/${provider.profilePicUrl}`
                    : null,
                resume: provider.resume 
                    ? `${req.protocol}://${req.get('host')}/${provider.resume}`
                    : null,
                passbookImage: provider.bankDetails.passbookImage 
                    ? `${req.protocol}://${req.get('host')}/${provider.bankDetails.passbookImage}`
                    : null
            }
        };

        res.status(200).json({
            success: true,
            provider: response
        });

    } catch (error) {
        console.error('Get provider details error:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({
                success: false,
                message: 'Invalid provider ID format'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error while fetching provider details'
        });
    }
};

/**
 * @desc    Get provider document (resume/profile/passbook)
 * @route   GET /api/admin/providers/:id/documents/:type
 * @access  Private (Admin)
 */
const getProviderDocument = async (req, res) => {
    try {
        const providerId = req.params.id;
        const documentType = req.params.type; // 'resume', 'profile', or 'passbook'

        // Validate document type
        if (!['resume', 'profile', 'passbook'].includes(documentType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document type. Must be "resume", "profile", or "passbook"'
            });
        }

        // Find provider
        const provider = await Provider.findById(providerId);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Determine file path based on document type
        let filePath;
        let fileName;
        
        switch (documentType) {
            case 'resume':
                if (!provider.resume) {
                    return res.status(404).json({
                        success: false,
                        message: 'Resume not found for this provider'
                    });
                }
                filePath = path.join(__dirname, '..', provider.resume);
                fileName = `${provider.name.replace(/\s+/g, '_')}_resume${path.extname(provider.resume)}`;
                break;
                
            case 'profile':
                if (!provider.profilePicUrl || provider.profilePicUrl === 'default-provider.jpg') {
                    return res.status(404).json({
                        success: false,
                        message: 'Profile picture not found for this provider'
                    });
                }
                filePath = path.join(__dirname, '..', provider.profilePicUrl);
                fileName = `${provider.name.replace(/\s+/g, '_')}_profile${path.extname(provider.profilePicUrl)}`;
                break;
                
            case 'passbook':
                if (!provider.bankDetails.passbookImage) {
                    return res.status(404).json({
                        success: false,
                        message: 'Passbook image not found for this provider'
                    });
                }
                filePath = path.join(__dirname, '..', provider.bankDetails.passbookImage);
                fileName = `${provider.name.replace(/\s+/g, '_')}_passbook${path.extname(provider.bankDetails.passbookImage)}`;
                break;
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.pdf') {
            contentType = 'application/pdf';
        }

        // Set headers and send file
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Type', contentType);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Get provider document error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching document'
        });
    }
};






/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
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
      revenueStats,
      userStats,
      providerStats,
      serviceStats,
      complaintStats,
      recentBookings,
      topServices,
      topProviders,
      transactionStats,
      couponStats
    ] = await Promise.all([
      // Booking counts
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today.toDate() } }),
      Booking.countDocuments({ createdAt: { $gte: currentWeek.toDate() } }),
      Booking.countDocuments({ createdAt: { $gte: currentMonth.toDate() } }),
      Booking.countDocuments({ createdAt: { $gte: currentYear.toDate() } }),

      // Booking status distribution
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Revenue calculations (using Transaction model for accurate financial data)
      Transaction.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { 
          $group: { 
            _id: null,
            totalRevenue: { $sum: '$amount' },
            todayRevenue: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', today.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            weeklyRevenue: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', currentWeek.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            monthlyRevenue: { 
              $sum: { 
                $cond: [
                  { $gte: ['$createdAt', currentMonth.toDate()] },
                  '$amount',
                  0
                ]
              }
            },
            yearlyRevenue: {
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

      // User statistics
      Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: currentMonth.toDate() } }),
        User.aggregate([
          { 
            $group: { 
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
              count: { $sum: 1 } 
            } 
          },
          { $sort: { _id: -1 } },
          { $limit: 7 }
        ])
      ]),

      // Provider statistics
      Promise.all([
        Provider.countDocuments(),
        Provider.countDocuments({ approved: true }),
        Provider.countDocuments({ approved: false }),
        Provider.countDocuments({ testPassed: true }),
        Provider.countDocuments({ createdAt: { $gte: currentMonth.toDate() } }),
        Provider.countDocuments({ kycStatus: 'approved' }),
        Provider.countDocuments({ kycStatus: 'pending' }),
        Provider.countDocuments({ kycStatus: 'rejected' })
      ]),

      // Service statistics
      Promise.all([
        Service.countDocuments(),
        Service.countDocuments({ isActive: true }),
        Service.countDocuments({ isActive: false }),
        Service.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ]),

      // Complaint statistics
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Recent bookings (last 5)
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name email')
        .populate('provider', 'name email')
        .populate('services.service', 'title'),

      // Top 5 services by bookings
      Booking.aggregate([
        { $unwind: '$services' },
        { $group: { _id: '$services.service', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: '$service' },
        { $project: { _id: 0, service: '$service.title', count: 1 } }
      ]),

      // Top 5 providers by earnings
      ProviderEarning.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$provider', totalEarnings: { $sum: '$netAmount' } } },
        { $sort: { totalEarnings: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'providers', localField: '_id', foreignField: '_id', as: 'provider' } },
        { $unwind: '$provider' },
        { $project: { _id: 0, provider: '$provider.name', totalEarnings: 1, phone: '$provider.phone' } }
      ]),

      // Transaction statistics
      Transaction.aggregate([
        { 
          $group: { 
            _id: '$paymentStatus', 
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          } 
        }
      ]),

      // Coupon statistics
      Coupon.aggregate([
        { 
          $group: { 
            _id: { isActive: '$isActive', isGlobal: '$isGlobal' }, 
            count: { $sum: 1 },
            totalDiscount: { $sum: { $size: '$usedBy' } }
          } 
        }
      ])
    ]);

    // Process the results
    const revenue = revenueStats[0] || {
      totalRevenue: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0
    };

    const bookingStatusCounts = bookingStatusStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { pending: 0, accepted: 0, completed: 0, cancelled: 0 });

    const complaintStatusCounts = complaintStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { open: 0, resolved: 0 });

    const transactionStatusCounts = transactionStats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        amount: curr.totalAmount
      };
      return acc;
    }, {});

    const couponStatsCounts = couponStats.reduce((acc, curr) => {
      const key = curr._id.isGlobal ? 'global' : 'assigned';
      if (curr._id.isActive) {
        acc.active[key] = curr.count;
        acc.active.totalDiscounts += curr.totalDiscount;
      } else {
        acc.inactive[key] = curr.count;
        acc.inactive.totalDiscounts += curr.totalDiscount;
      }
      return acc;
    }, { 
      active: { global: 0, assigned: 0, totalDiscounts: 0 },
      inactive: { global: 0, assigned: 0, totalDiscounts: 0 }
    });

    // Prepare the response
    const dashboardStats = {
      overview: {
        totalBookings,
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        yearlyBookings,
        bookingStatus: bookingStatusCounts,
        totalRevenue: revenue.totalRevenue,
        todayRevenue: revenue.todayRevenue,
        weeklyRevenue: revenue.weeklyRevenue,
        monthlyRevenue: revenue.monthlyRevenue,
        yearlyRevenue: revenue.yearlyRevenue
      },
      users: {
        total: userStats[0],
        newThisMonth: userStats[1],
        dailySignups: userStats[2]
      },
      providers: {
        total: providerStats[0],
        approved: providerStats[1],
        pendingApproval: providerStats[2],
        testPassed: providerStats[3],
        newThisMonth: providerStats[4],
        kycApproved: providerStats[5],
        kycPending: providerStats[6],
        kycRejected: providerStats[7]
      },
      services: {
        total: serviceStats[0],
        active: serviceStats[1],
        inactive: serviceStats[2],
        byCategory: serviceStats[3]
      },
      complaints: complaintStatusCounts,
      transactions: transactionStatusCounts,
      coupons: couponStatsCounts,
      recentBookings,
      topServices,
      topProviders
    };

    res.json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};




/**
 * Get all admins (protected route)
 */
const getAllAdmins = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Search filter
        const search = req.query.search || '';
        const filter = {
            ...(search && {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            })
        };

        // Get admins with pagination
        const admins = await Admin.find(filter)
            .select('-password -__v') // Exclude password and version key
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); // Sort by newest first

        // Get total count for pagination
        const total = await Admin.countDocuments(filter);

        // Prepare response data
        const adminData = admins.map(admin => ({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            isAdmin: admin.isAdmin,
            createdAt: admin.createdAt,
            updatedAt: admin.updatedAt
        }));

        res.status(200).json({
            success: true,
            count: adminData.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            admins: adminData
        });

    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching admins'
        });
    }
};

module.exports = {
    registerAdmin,
    getAdminProfile,
    getAllAdmins,
    getAllCustomers,
    approveProvider,
    getPendingProviders,
    getAllProviders,
    getProviderDetails,
    getProviderDocument,
    getDashboardStats
};
