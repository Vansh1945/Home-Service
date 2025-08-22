const jwt = require('jsonwebtoken');
const User = require('../models/User-model');

/**
 * User Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const userAuthMiddleware = async (req, res, next) => {
    // Extract token from header
    const token = req.header('Authorization');
    
    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({ 
            success: false,
            message: "Unauthorized. User token not provided or invalid format." 
        });
    }

    const jwtToken = token.replace("Bearer ", "").trim();

    if (!jwtToken || jwtToken === 'null' || jwtToken === 'undefined') {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Token is missing or invalid."
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        
        // Find user in database with basic profile data
        const user = await User.findById(decoded.id)
            .select('-password')
            .select('+couponsUsed +customDiscount'); // Include sensitive fields if needed

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Unauthorized. User not found." 
            });
        }

        // Verify user role is customer
        if (user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: "Forbidden. This route is for customers only."
            });
        }

        // Attach user data to request object
        req.user = user;
        req.token = jwtToken;
        req.userID = user._id;
        req.role = user.role;

        next();
    } catch (error) {
        console.error("User auth middleware error:", error);
        
        let message = "Unauthorized. Invalid user token.";
        if (error.name === 'TokenExpiredError') {
            message = "User session expired. Please login again.";
        } else if (error.name === 'JsonWebTokenError') {
            message = "Invalid user token. Please login again.";
        }

        res.status(401).json({ 
            success: false,
            message 
        });
    }
};

/**
 * Middleware to check if first booking was used
 */
const firstBookingCheckMiddleware = (req, res, next) => {
    if (req.user.firstBookingUsed) {
        return res.status(403).json({
            success: false,
            message: "First booking discount already used."
        });
    }
    next();
};

/**
 * Middleware to validate custom discount access
 */
const discountAccessMiddleware = (req, res, next) => {
    if (req.user.customDiscount <= 0) {
        return res.status(403).json({
            success: false,
            message: "No active discount available."
        });
    }
    next();
};

module.exports = {
    userAuthMiddleware,
    firstBookingCheckMiddleware,
    discountAccessMiddleware
};