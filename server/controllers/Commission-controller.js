const CommissionRule = require('../models/CommissionRule-model');
const Booking = require('../models/Booking-model');
const Provider = require('../models/Provider-model');

// Process commission for a completed booking
exports.processBookingCommission = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId)
      .populate('provider service');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Commission can only be processed for completed bookings'
      });
    }
    
    const provider = await Provider.findById(booking.provider._id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const performanceTier = provider.performanceTier || 'standard';
    
    const commissionDetails = await CommissionRule.getCommissionForProvider(
      booking.provider._id,
      performanceTier
    );
    
    let commissionAmount;
    if (commissionDetails.type === 'percentage') {
      commissionAmount = (booking.totalAmount * commissionDetails.value) / 100;
    } else {
      commissionAmount = commissionDetails.value;
    }
    
    // Update provider's wallet directly
    provider.wallet += (booking.totalAmount - commissionAmount);
    await provider.save();
    
    res.status(200).json({
      success: true,
      data: {
        booking: booking._id,
        totalAmount: booking.totalAmount,
        commissionRate: `${commissionDetails.value}${commissionDetails.type === 'percentage' ? '%' : ' fixed'}`,
        commissionAmount,
        providerEarning: booking.totalAmount - commissionAmount,
        appliedRule: commissionDetails.name || 'Default Commission'
      }
    });
    
  } catch (error) {
    console.error('Commission processing error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// Get commission details for a provider
exports.getProviderCommissionDetails = async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const provider = await Provider.findById(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Get provider's performance tier
    const performanceTier = provider.performanceTier || 'standard';

    // Get all applicable commission rules
    const currentRule = await CommissionRule.getCommissionForProvider(
      providerId,
      performanceTier
    );

    // Get all active rules for reference
    const allRules = await CommissionRule.find({ isActive: true })
      .sort({ applyTo: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        provider: {
          id: provider._id,
          name: provider.name,
          performanceTier
        },
        currentCommission: currentRule,
        allActiveRules: allRules
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all commission rules (for admin)
exports.listCommissionRules = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const rules = await CommissionRule.find(query)
      .populate('createdBy updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await CommissionRule.countDocuments(query);

    res.status(200).json({
      success: true,
      data: rules,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Create new commission rule
exports.createCommissionRule = async (req, res) => {
  try {
    const { name, description, type, value, applyTo, performanceTier } = req.body;

    // Validate input
    if (applyTo === 'performanceTier' && !performanceTier) {
      return res.status(400).json({
        success: false,
        message: 'Performance tier is required when applyTo is performanceTier'
      });
    }

    const newRule = new CommissionRule({
      name,
      description,
      type,
      value,
      applyTo,
      performanceTier: applyTo === 'performanceTier' ? performanceTier : undefined,
      createdBy: req.admin._id
    });

    await newRule.save();

    res.status(201).json({
      success: true,
      data: newRule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update commission rule status
exports.toggleCommissionRuleStatus = async (req, res) => {
  try {
    const rule = await CommissionRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Commission rule not found'
      });
    }

    rule.isActive = !rule.isActive;
    rule.updatedBy = req.admin._id;
    await rule.save();

    res.status(200).json({
      success: true,
      data: rule,
      message: `Rule is now ${rule.isActive ? 'active' : 'inactive'}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// Update commission rule
exports.updateCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the rule
    const rule = await CommissionRule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Commission rule not found'
      });
    }

    // Prevent changing critical fields if rule is active
    if (rule.isActive) {
      const immutableFields = ['type', 'applyTo', 'performanceTier', 'specificProvider'];
      for (const field of immutableFields) {
        if (updates[field] && updates[field] !== rule[field]) {
          return res.status(400).json({
            success: false,
            message: `Cannot change ${field} for an active commission rule. Deactivate first.`
          });
        }
      }
    }

    // Validate performance tier if applyTo is performanceTier
    if (updates.applyTo === 'performanceTier' && !updates.performanceTier) {
      return res.status(400).json({
        success: false,
        message: 'Performance tier is required when applyTo is performanceTier'
      });
    }

    // Validate specific provider if applyTo is specificProvider
    if (updates.applyTo === 'specificProvider') {
      if (!updates.specificProvider) {
        return res.status(400).json({
          success: false,
          message: 'Specific provider is required when applyTo is specificProvider'
        });
      }
      const providerExists = await Provider.exists({ _id: updates.specificProvider });
      if (!providerExists) {
        return res.status(400).json({
          success: false,
          message: 'Specified provider does not exist'
        });
      }
    }

    // Update the rule
    Object.assign(rule, updates);
    rule.updatedBy = req.admin._id;
    await rule.save();

    res.status(200).json({
      success: true,
      data: rule,
      message: 'Commission rule updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete commission rule
exports.deleteCommissionRule = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if rule exists
    const rule = await CommissionRule.findById(id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Commission rule not found'
      });
    }

    // Check if rule is active
    if (rule.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active commission rule. Deactivate first.'
      });
    }

    // Check if rule is referenced in any transactions
    const Transaction = require('../models/Transaction-model ');
    const referencedTransactions = await Transaction.countDocuments({
      'commissionRule': rule._id
    });

    if (referencedTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete commission rule as it is referenced in existing transactions'
      });
    }

    // Delete the rule
    await rule.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Commission rule deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};