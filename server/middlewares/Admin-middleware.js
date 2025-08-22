const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin-model');

/**
 * Admin Authentication Middleware
 * Verifies JWT token and checks for admin privileges
 */
const adminAuthMiddleware = async (req, res, next) => {
    // Extract token from header
    const token = req.header('Authorization');
    
    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({ 
            success: false,
            message: "Unauthorized. Admin token not provided or invalid format." 
        });
    }

    const jwtToken = token.replace("Bearer ", "").trim();

    try {
        // Verify token
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        
        // Find admin in database
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            return res.status(401).json({ 
                success: false,
                message: "Unauthorized. Admin not found." 
            });
        }

        // Verify admin status
        if (!admin.isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Forbidden. Admin privileges required."
            });
        }

        // Attach admin data to request object
        req.admin = admin;
        req.token = jwtToken;
        req.adminID = admin._id;
        req.role = 'admin';

        next();
    } catch (error) {
        console.error("Admin auth middleware error:", error);
        
        let message = "Unauthorized. Invalid admin token.";
        if (error.name === 'TokenExpiredError') {
            message = "Admin session expired. Please login again.";
        } else if (error.name === 'JsonWebTokenError') {
            message = "Invalid admin token. Please login again.";
        }

        res.status(401).json({ 
            success: false,
            message 
        });
    }
};

module.exports = adminAuthMiddleware;