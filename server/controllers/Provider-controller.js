const Provider = require('../models/Provider-model');
const ProviderEarning = require('../models/ProviderEarning-model');
const { sendOTP, verifyOTP, clearOTP } = require('../utils/otpSend');
const { uploadProfilePic, uploadResume, uploadPassbookImg } = require('../middlewares/upload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Helper function to delete file
const deleteFile = (filePath) => {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};


/**
 * @desc    Register provider with email verification (step 1: send OTP)
 * @route   POST /api/providers/register/initiate
 * @access  Public
 */
exports.initiateRegistration = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Check if provider already exists (either fully registered or in progress)
        const existingProvider = await Provider.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') }, 
            isDeleted: false 
        });
        
        if (existingProvider) {
            if (existingProvider.profileComplete) {
                return res.status(400).json({
                    success: false,
                    message: 'Provider with this email already exists'
                });
            } 
        }

        // Send OTP to email
        await sendOTP(email);

        res.status(200).json({
            success: true,
            message: 'OTP sent to email'
        });
    } catch (error) {
        console.error('Initiate registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Verify OTP and complete registration (step 2: verify OTP and create basic account)
 * @route   POST /api/providers/register/complete
 * @access  Public
 */
exports.completeRegistration = async (req, res) => {
    try {
        const { email, otp, password, name, phone, dateOfBirth } = req.body;

        // Validate required fields for registration only
        if (!email || !otp || !password || !name || !phone || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, password, name, phone and date of birth are required'
            });
        }

        // Validate email format
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Validate phone number format (simple validation - at least 10 digits)
        const phoneRegex = /^\d{10,10}$/; // Allows 10-10 digits
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) { // Remove non-digits before validation
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid phone number (10-15 digits)'
            });
        }

        // Verify OTP
        try {
            verifyOTP(email, otp);
        } catch (otpError) {
            return res.status(400).json({
                success: false,
                message: otpError.message
            });
        }

        // Clear OTP after successful verification
        clearOTP(email);

        // Check if provider already exists and profile is complete
        const existingCompleteProvider = await Provider.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') },
            isDeleted: false,
            profileComplete: true
        });
        if (existingCompleteProvider) {
            return res.status(400).json({
                success: false,
                message: 'Provider with this email already exists'
            });
        }

        // Calculate age from date of birth
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        // Minimum age requirement (18 years)
        if (age < 18) {
            return res.status(400).json({
                success: false,
                message: 'You must be at least 18 years old to register'
            });
        }

        // Check if provider exists but profile is incomplete (update instead of create)
        const existingIncompleteProvider = await Provider.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') },
            isDeleted: false,
            profileComplete: false
        });

        let provider;
        
        if (existingIncompleteProvider) {
            // Update existing incomplete provider
            existingIncompleteProvider.password = password;
            existingIncompleteProvider.name = name;
            existingIncompleteProvider.phone = phone.replace(/\D/g, ''); // Store only digits
            existingIncompleteProvider.dateOfBirth = dob;
            provider = await existingIncompleteProvider.save();
        } else {
            // Create new provider with basic info only
            provider = new Provider({
                email,
                password,
                name,
                phone: phone.replace(/\D/g, ''), // Store only digits
                dateOfBirth: dob,
                profileComplete: false // Mark as incomplete
            });
            await provider.save();
        }

        // Generate JWT token
        const token = provider.generateJWT();

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please complete your profile.',
            token,
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                phone: provider.phone,
                profileComplete: provider.profileComplete
            }
        });
    } catch (error) {
        console.error('Complete registration error:', error);
        
        
        res.status(500).json({
            success: false,
            message: 'Failed to complete registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Login for profile completion (step 3)
 * @route   POST /api/providers/login-for-completion
 * @access  Public
 */
exports.loginForCompletion = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password'
            });
        }

        // Find provider (case insensitive email search)
        const provider = await Provider.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        }).select('+password +profileComplete');

        if (!provider) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if profile is already complete
        if (provider.profileComplete) {
            return res.status(400).json({
                success: false,
                message: 'Profile is already completed'
            });
        }

        // Verify password
        const isMatch = await provider.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = provider.generateJWT();

        res.status(200).json({
            success: true,
            message: 'Login successful. Please complete your profile.',
            token,
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                profileComplete: provider.profileComplete
            }
        });
    } catch (error) {
        console.error('Login for completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Complete provider profile (step 4: after login)
 * @route   PUT /api/providers/profile/complete
 * @access  Private (requires authentication)
 */
exports.completeProfile = async (req, res) => {
    try {
        const providerId = req.providerId;
        const {
            services,
            experience,
            serviceArea,
            street,
            city,
            state,
            postalCode,
            country,
            accountNo,
            ifsc
        } = req.body;

        // Validate required fields
        if (!services || !experience || !serviceArea || !street || !city || 
            !state || !postalCode || !accountNo || !ifsc) {
            return res.status(400).json({
                success: false,
                message: 'All professional and bank details are required'
            });
        }

        // Validate IFSC format
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid IFSC code'
            });
        }

        // Validate account number
        const accountNoRegex = /^[0-9]{9,18}$/;
        if (!accountNoRegex.test(accountNo)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid account number (9-18 digits)'
            });
        }

        // Get provider
        const provider = await Provider.findById(providerId);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if profile is already complete
        if (provider.profileComplete) {
            return res.status(400).json({
                success: false,
                message: 'Profile is already completed'
            });
        }

        // Update professional info
        provider.services = services;
        provider.experience = experience;
        provider.serviceArea = serviceArea;

        // Update address
        provider.address = {
            street,
            city,
            state,
            postalCode,
            country: country || 'India'
        };

        // Update bank details
        provider.bankDetails = {
            accountNo,
            ifsc,
            passbookImage: req.files['passbookImage'] ? req.files['passbookImage'][0].path : undefined,
            verified: false
        };

        // Update profile picture if uploaded
        if (req.files['profilePic']) {
            provider.profilePicUrl = req.files['profilePic'][0].path;
        }

        // Update resume if uploaded
        if (req.files['resume']) {
            provider.resume = req.files['resume'][0].path;
        }

        // Mark profile as complete
        provider.profileComplete = true;
        provider.registrationDate = new Date();
        await provider.save();

        res.status(200).json({
            success: true,
            message: 'Profile completed successfully. Your account is pending approval.',
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                profileComplete: provider.profileComplete,
                kycStatus: provider.kycStatus,
                approved: provider.approved
            }
        });
    } catch (error) {
        console.error('Complete profile error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = {};
            const errorMessages = [];
            
            // Extract specific field errors
            for (let field in error.errors) {
                const fieldError = error.errors[field];
                validationErrors[field] = fieldError.message;
                errorMessages.push(fieldError.message);
            }
            
            return res.status(400).json({
                success: false,
                message: errorMessages.length === 1 ? errorMessages[0] : 'Please fix the following errors',
                errors: validationErrors,
                fieldErrors: errorMessages
            });
        }
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to complete profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


/**
 * @desc    Get provider profile with earnings data
 * @route   GET /api/providers/profile
 * @access  Private (Provider)
 */
exports.getProfile = async (req, res) => {
    try {
        console.log(`[PROFILE] Fetching profile for provider: ${req.providerId}`);
        
        const provider = await Provider.findById(req.providerId)
            .select('-password -__v')
            .populate({
                path: 'feedbacks',
                select: 'providerFeedback',
                options: { limit: 10, sort: { createdAt: -1 } }
            });

        if (!provider) {
            console.log(`[PROFILE] Provider not found: ${req.providerId}`);
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        console.log(`[PROFILE] Provider found: ${provider.name}`);

        // Get earnings summary and available balance
        const [earningsSummary, availableBalance] = await Promise.all([
            ProviderEarning.getEarningsSummary(req.providerId),
            ProviderEarning.getAvailableBalance(req.providerId)
        ]);

        console.log(`[PROFILE] Earnings summary:`, earningsSummary);
        console.log(`[PROFILE] Available balance:`, availableBalance);

        // Calculate total earnings from all completed bookings
        let totalEarnings = 0;
        let completedBookingsCount = 0;
        
        // Format earnings data with better structure
        const earningsData = {
            availableBalance: availableBalance || 0,
            totalEarnings: 0,
            summary: {}
        };

        if (earningsSummary && earningsSummary.length > 0) {
            earningsSummary.forEach(item => {
                earningsData.summary[item._id] = {
                    totalGross: item.totalGross || 0,
                    totalCommission: item.totalCommission || 0,
                    totalNet: item.totalNet || 0,
                    count: item.count || 0
                };
                
                // Calculate total earnings from all statuses
                totalEarnings += item.totalNet || 0;
                
                // Count completed bookings
                if (item._id === 'paid' || item._id === 'available') {
                    completedBookingsCount += item.count || 0;
                }
            });
        }

        earningsData.totalEarnings = totalEarnings;

        // Calculate average rating from populated feedbacks
        let averageRating = 0;
        let ratingCount = 0;
        
        if (provider.feedbacks && provider.feedbacks.length > 0) {
            const validRatings = provider.feedbacks
                .filter(feedback => feedback.providerFeedback && feedback.providerFeedback.rating)
                .map(feedback => feedback.providerFeedback.rating);
            
            if (validRatings.length > 0) {
                const sum = validRatings.reduce((acc, rating) => acc + rating, 0);
                averageRating = parseFloat((sum / validRatings.length).toFixed(1));
                ratingCount = validRatings.length;
            }
        }

        console.log(`[PROFILE] Calculated average rating: ${averageRating} from ${ratingCount} ratings`);

        // Add computed fields
        const responseData = {
            ...provider.toJSON(),
            age: provider.age, // Virtual field
            averageRating: averageRating,
            ratingCount: ratingCount,
            completedBookings: completedBookingsCount,
            earnings: earningsData,
            hasResume: !!provider.resume,
            hasPassbookImage: !!provider.bankDetails?.passbookImage,
            hasProfilePic: !!provider.profilePicUrl && provider.profilePicUrl !== 'default-provider.jpg'
        };

        console.log(`[PROFILE] Response data structure:`, {
            averageRating: responseData.averageRating,
            totalEarnings: responseData.earnings.totalEarnings,
            availableBalance: responseData.earnings.availableBalance,
            completedBookings: responseData.completedBookings
        });

        res.status(200).json({
            success: true,
            provider: responseData
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



/**
 * @desc    Unified function to update provider profile (all sections)
 * @route   PUT /api/providers/profile
 * @access  Private (Provider)
 */
exports.updateProviderProfile = async (req, res) => {
    try {
        console.log('Unified profile update request:', {
            body: req.body,
            providerID: req.providerId,
            files: req.files
        });

        const {
            // Basic info
            name, phone, dateOfBirth,
            // Professional info
            services, experience, serviceArea,
            // Address info
            street, city, state, postalCode, country,
            // Bank details
            accountNo, ifsc,
            // Update type to determine which section to update
            updateType
        } = req.body;

        const updates = {};
        let successMessage = 'Profile updated successfully';

        // Get current provider
        const currentProvider = await Provider.findById(req.providerId);
        if (!currentProvider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Handle different update types or update all if no type specified
        if (!updateType || updateType === 'basic') {
            // Basic Information Updates
            if (name && typeof name === 'string') {
                updates.name = name.trim();
            }
            
            if (phone && typeof phone === 'string') {
                if (!/^\d{10,15}$/.test(phone)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please enter a valid phone number (10-15 digits)'
                    });
                }
                updates.phone = phone.trim();
            }
            
            if (dateOfBirth) {
                const dob = new Date(dateOfBirth);
                if (isNaN(dob.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid date format for date of birth'
                    });
                }
                
                // Age validation (minimum 18 years)
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const monthDiff = today.getMonth() - dob.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                
                if (age < 18) {
                    return res.status(400).json({
                        success: false,
                        message: 'You must be at least 18 years old'
                    });
                }
                
                updates.dateOfBirth = dob;
            }
        }

        if (!updateType || updateType === 'professional') {
            // Professional Information Updates
            if (services) updates.services = services;
            if (experience !== undefined) updates.experience = experience;
            if (serviceArea) updates.serviceArea = serviceArea;
        }

        if (!updateType || updateType === 'address') {
            // Address Updates
            if (street || city || state || postalCode || country) {
                updates.address = {
                    ...currentProvider.address,
                    ...(street && { street }),
                    ...(city && { city }),
                    ...(state && { state }),
                    ...(postalCode && { postalCode }),
                    ...(country && { country })
                };
            }
        }

        if (!updateType || updateType === 'bank') {
            // Bank Details Updates
            if (accountNo || ifsc) {
                // Validate IFSC if provided
                if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please enter a valid IFSC code'
                    });
                }

                // Validate account number if provided
                if (accountNo && !/^[0-9]{9,18}$/.test(accountNo)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please enter a valid account number (9-18 digits)'
                    });
                }

                updates.bankDetails = {
                    ...currentProvider.bankDetails,
                    ...(accountNo && { accountNo }),
                    ...(ifsc && { ifsc }),
                    verified: false // Reset verification when details change
                };
            }
        }

        // Handle file uploads
        if (req.files) {
            // Profile Picture Upload
            if (req.files['profilePic']) {
                const profilePic = req.files['profilePic'][0];
                
                // Delete old profile picture
                if (currentProvider.profilePicUrl && currentProvider.profilePicUrl !== 'default-provider.jpg') {
                    deleteFile(path.join(__dirname, '../', currentProvider.profilePicUrl));
                }
                
                updates.profilePicUrl = profilePic.path;
                successMessage = 'Profile picture updated successfully';
            }

            // Resume Upload
            if (req.files['resume']) {
                const resume = req.files['resume'][0];
                
                // Delete old resume
                if (currentProvider.resume) {
                    deleteFile(path.join(__dirname, '../', currentProvider.resume));
                }
                
                updates.resume = resume.path;
                successMessage = 'Resume updated successfully';
            }

            // Passbook Image Upload
            if (req.files['passbookImage']) {
                const passbookImage = req.files['passbookImage'][0];
                
                // Delete old passbook image
                if (currentProvider.bankDetails?.passbookImage) {
                    deleteFile(path.join(__dirname, '../', currentProvider.bankDetails.passbookImage));
                }
                
                updates.bankDetails = {
                    ...currentProvider.bankDetails,
                    ...updates.bankDetails,
                    passbookImage: passbookImage.path,
                    verified: false
                };
                successMessage = 'Bank details updated successfully';
            }
        }

        // Handle single file uploads (for backward compatibility)
        if (req.file) {
            const fieldName = req.file.fieldname;
            
            if (fieldName === 'profilePic') {
                if (currentProvider.profilePicUrl && currentProvider.profilePicUrl !== 'default-provider.jpg') {
                    deleteFile(path.join(__dirname, '../', currentProvider.profilePicUrl));
                }
                updates.profilePicUrl = req.file.path;
                successMessage = 'Profile picture updated successfully';
            } else if (fieldName === 'resume') {
                if (currentProvider.resume) {
                    deleteFile(path.join(__dirname, '../', currentProvider.resume));
                }
                updates.resume = req.file.path;
                successMessage = 'Resume updated successfully';
            } else if (fieldName === 'passbookImage') {
                if (currentProvider.bankDetails?.passbookImage) {
                    deleteFile(path.join(__dirname, '../', currentProvider.bankDetails.passbookImage));
                }
                updates.bankDetails = {
                    ...currentProvider.bankDetails,
                    ...updates.bankDetails,
                    passbookImage: req.file.path,
                    verified: false
                };
                successMessage = 'Bank details updated successfully';
            }
        }

        // Perform the update
        const updatedProvider = await Provider.findByIdAndUpdate(
            req.providerId,
            updates,
            { 
                new: true, 
                runValidators: true,
                select: '-password -__v'
            }
        );

        if (!updatedProvider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: successMessage,
            provider: updatedProvider
        });

    } catch (error) {
        console.error('Unified profile update error:', error);
        
        // Clean up uploaded files if error occurred
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => deleteFile(file.path));
            });
        }
        if (req.file) {
            deleteFile(req.file.path);
        }
        
        // Handle specific error types
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: messages
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    View document (resume, passbook image, profile picture)
 * @route   GET /api/providers/document/:type
 * @access  Private (Provider)
 */
exports.viewDocument = async (req, res) => {
    try {
        const { type } = req.params;
        const provider = await Provider.findById(req.providerId);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        let filePath;
        let fileName;

        switch (type) {
            case 'resume':
                filePath = provider.resume;
                fileName = 'resume';
                break;
            case 'passbook':
                filePath = provider.bankDetails?.passbookImage;
                fileName = 'passbook';
                break;
            case 'profile':
                filePath = provider.profilePicUrl;
                fileName = 'profile-picture';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid document type. Use: resume, passbook, or profile'
                });
        }

        if (!filePath) {
            return res.status(404).json({
                success: false,
                message: `${fileName.charAt(0).toUpperCase() + fileName.slice(1)} not found`
            });
        }

        const fullPath = path.join(__dirname, '../', filePath);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: `${fileName.charAt(0).toUpperCase() + fileName.slice(1)} file not found on server`
            });
        }

        // Set appropriate headers
        const ext = path.extname(fullPath).toLowerCase();
        let contentType = 'application/octet-stream';

        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            contentType = `image/${ext.slice(1)}`;
        } else if (ext === '.pdf') {
            contentType = 'application/pdf';
        } else if (['.doc', '.docx'].includes(ext)) {
            contentType = 'application/msword';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}${ext}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('View document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to view document',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Delete provider account (soft delete)
 * @route   DELETE /api/providers/profile
 * @access  Private (Provider)
 */
exports.deleteAccount = async (req, res) => {
    try {
        const provider = await Provider.findById(req.providerId);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Mark as deleted
        provider.isDeleted = true;
        provider.isActive = false;
        await provider.save();

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get service categories from Provider model enum
 * @route   GET /api/providers/service-categories
 * @access  Public
 */
exports.getServiceCategories = async (req, res) => {
    try {
        // Get the service enum values from the Provider schema
        const serviceEnum = Provider.schema.paths.services.enumValues;
        
        // Format the response to match frontend expectations
        const serviceCategories = serviceEnum.map(service => ({
            _id: service.toLowerCase().replace(/\s+/g, '-'),
            title: service,
            category: service
        }));

        res.status(200).json({
            success: true,
            message: 'Service categories retrieved successfully',
            data: serviceCategories
        });
    } catch (error) {
        console.error('Get service categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get service categories',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Permanently delete provider account (admin only)
 * @route   DELETE /api/providers/:id/permanent
 * @access  Private (Admin)
 */
exports.permanentDeleteAccount = async (req, res) => {
    try {
        // Check if user is admin (you would implement your own admin check)
        if (req.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Admin access required'
            });
        }

        const provider = await Provider.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Delete files
        if (provider.profilePicUrl && provider.profilePicUrl !== 'default-provider.jpg') {
            deleteFile(path.join(__dirname, '../', provider.profilePicUrl));
        }
        if (provider.resume) {
            deleteFile(path.join(__dirname, '../', provider.resume));
        }
        if (provider.bankDetails.passbookImage) {
            deleteFile(path.join(__dirname, '../', provider.bankDetails.passbookImage));
        }

        // Permanent delete
        await Provider.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Account permanently deleted'
        });
    } catch (error) {
        console.error('Permanent delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete account',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


