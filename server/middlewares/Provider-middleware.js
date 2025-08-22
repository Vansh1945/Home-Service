const jwt = require('jsonwebtoken');
const Provider = require('../models/Provider-model');



/**
 * Provider Authentication Middleware
 */
const providerAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization');

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization token required"
            });
        }

        const jwtToken = token.replace("Bearer ", "").trim();
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);

        // Basic provider query without populating first
        let provider = await Provider.findById(decoded.id).select('-password');
        // console.log("✅ Provider found in DB:", provider);

        if (!provider) {
            return res.status(401).json({
                success: false,
                message: "Provider account not found"
            });
        }



        // Try to populate if models exist
        try {
            provider = await Provider.findById(decoded.id)
                .select('-password')
                .populate({
                    path: 'feedbacks',
                    select: 'rating comment',
                    options: { limit: 5 } // Safety limit
                })
                .populate({
                    path: 'earningsHistory',
                    select: 'amount date',
                    options: { limit: 5 } // Safety limit
                });
        } catch (populateError) {
        }

        // Rest of your middleware checks...
        if (provider.isDeleted) {
            return res.status(403).json({
                success: false,
                message: "Account deactivated"
            });
        }

        // Attach provider to request
        req.provider = provider;
        req.token = jwtToken;
        req.providerId = provider._id;
        req.role = 'provider';

        next();
    } catch (error) {
        console.error("Provider auth error:", error);

        let message = "Authentication failed";
        let status = 401;

        if (error.name === 'TokenExpiredError') {
            message = "Session expired. Please login again";
        } else if (error.name === 'JsonWebTokenError') {
            message = "Invalid token format";
        } else {
            status = 500;
            message = "Internal server error";
        }

        res.status(status).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Middleware to check if provider has passed the test
 */
const providerTestPassedMiddleware = async (req, res, next) => {
    try {
        if (!req.provider) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const provider = await Provider.findById(req.provider._id);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider account not found'
            });
        }

        if (!provider.testPassed) {
            return res.status(403).json({
                success: false,
                message: 'You must complete the provider qualification test first',
                testRequired: true,
                testPassed: false
            });
        }

        next();
    } catch (error) {
        console.error('Test check middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Middleware to check if provider needs to take test
 * (Allows access to test routes without test completion)
 */
const providerTestAccessMiddleware = async (req, res, next) => {
    try {
        if (!req.provider) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const provider = await Provider.findById(req.provider._id);

        // Allow access to test-related routes
        if (req.path.includes('/test/')) {
            return next();
        }

        // Block other routes if test not passed
        if (!provider.testPassed) {
            return res.status(403).json({
                success: false,
                message: 'Complete the qualification test to access this feature',
                testRequired: true
            });
        }

        next();
    } catch (error) {
        console.error('Test access middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    providerAuthMiddleware,
    providerTestPassedMiddleware,
    providerTestAccessMiddleware
};