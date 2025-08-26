const Coupon = require('../models/Coupon-model');
const User = require('../models/User-model');

// ADMIN CONTROLLERS

// Create new coupon
const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, expiryDate, minBookingValue, isGlobal, isFirstBooking, assignedTo, usageLimit } = req.body;

    if (isFirstBooking) {
      const existingFirstBookingCoupon = await Coupon.findOne({ isFirstBooking: true, isActive: true });
      if (existingFirstBookingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Active first-booking coupon already exists'
        });
      }
    }

    if (assignedTo) {
      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }

    const coupon = await Coupon.createCoupon(req.adminID, {
      code,
      discountType,
      discountValue,
      expiryDate,
      minBookingValue: minBookingValue || 0,
      isGlobal,
      isFirstBooking,
      assignedTo,
      usageLimit: usageLimit || null // Set to null for unlimited usage
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all coupons with filters
const getAllCoupons = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filters = {};

    if (status === 'active') {
      filters.isActive = true;
      filters.expiryDate = { $gte: new Date() };
    } else if (status === 'expired') {
      filters.$or = [
        { isActive: false },
        { expiryDate: { $lt: new Date() } }
      ];
    }

    if (type === 'global') {
      filters.isGlobal = true;
    } else if (type === 'first-booking') {
      filters.isFirstBooking = true;
    } else if (type === 'assigned') {
      filters.assignedTo = { $ne: null };
    }

    const coupons = await Coupon.listAllCoupons(req.adminID, filters);
    
    res.json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update coupon
const updateCoupon = async (req, res) => {
  try {

    const { id } = req.params;
    const updateData = req.body;

    // Check if coupon exists
    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Prevent modifying certain fields if coupon has been used
    if (existingCoupon.usedBy.length > 0) {
      const restrictedFields = ['code', 'discountType', 'discountValue', 'isGlobal', 'isFirstBooking'];
      restrictedFields.forEach(field => {
        if (field in updateData) {
          delete updateData[field];
        }
      });
    }

    // Handle date conversion if needed
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);

    // Handle specific error types
    let errorMessage = 'Failed to update coupon';
    let statusCode = 500;

    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
    } else if (error.code === 11000) {
      statusCode = 409;
      errorMessage = 'Coupon code already exists';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// Delete coupon (soft delete)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check admin ownership
    if (!coupon.createdBy.equals(req.adminID)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this coupon'
      });
    }

    // Soft delete by setting isActive to false
    coupon.isActive = false;
    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Hard delete coupon (permanent removal)
const hardDeleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check admin ownership
    if (!coupon.createdBy.equals(req.adminID)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this coupon'
      });
    }

    // Permanent deletion
    await Coupon.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Coupon permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// USER CONTROLLERS

// Validate and apply coupon
const applyCoupon = async (req, res) => {
  try {
    const { code, bookingValue } = req.body;
    const userId = req.user.id;

    const coupon = await Coupon.validateCoupon(userId, code, bookingValue);
    const discountDetails = coupon.applyCoupon(bookingValue);

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          formattedDiscount: coupon.formattedDiscount
        },
        discountAmount: discountDetails.discount,
        finalAmount: discountDetails.finalAmount
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const markCouponUsed = async (req, res) => {
  try {
    const { code, bookingValue } = req.body;
    const userId = req.user.id;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await coupon.markAsUsed(userId, bookingValue);

    res.json({
      success: true,
      message: 'Coupon marked as used'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getAvailableCoupons = async (req, res) => {
  try {
    const { bookingValue } = req.query;
    const userId = req.user.id;
    const currentDate = new Date();

    // First, check if user has already used first-booking coupon
    const hasUsedFirstBookingCoupon = await Coupon.exists({
      isFirstBooking: true,
      'usedBy.userId': userId
    });

    // Base query for active, non-expired coupons available to user
    const query = {
      isActive: true,
      expiryDate: { $gte: currentDate },
      $or: [
        { isGlobal: true },
        { assignedTo: userId }
      ]
    };

    // Only include first-booking coupon if user hasn't used it
    if (!hasUsedFirstBookingCoupon) {
      query.$or.push({ isFirstBooking: true });
    }

    // If bookingValue is provided, add minBookingValue filter
    if (bookingValue !== undefined) {
      query.minBookingValue = { $lte: Number(bookingValue) };
    }

    const coupons = await Coupon.find(query)
      .sort({ discountValue: -1 }) // Sort by highest discount first
      .lean();

    res.json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  hardDeleteCoupon,
  applyCoupon,
  markCouponUsed,
  getAvailableCoupons
};