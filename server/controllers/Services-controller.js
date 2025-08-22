const mongoose = require('mongoose');
const Service = require('../models/Service-model');
const Admin = require('../models/Admin-model');
const Provider = require('../models/Provider-model');
const excelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

/**
 * ADMIN CONTROLLERS
 */

// Create a new service (Admin only)
const createService = async (req, res) => {
    try {
        const { title, category, description, basePrice, duration } = req.body;
        const image = req.file ? req.file.filename : 'default-service.jpg';

        const service = await Service.createService(req.adminID, {
            title,
            category,
            description,
            basePrice,
            duration,
            image
        });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: service
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create service'
        });
    }
};

// Update service details (Admin only)
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (req.file) {
            updates.image = req.file.filename;
        }

        // Find and update service
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if admin is the creator
        if (!service.createdBy.equals(req.adminID)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this service'
            });
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            if (key in service) {
                service[key] = updates[key];
            }
        });

        await service.save();

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update service'
        });
    }
};

// Update base price (Admin only)
const updateBasePrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { basePrice } = req.body;

        const service = await Service.updateBasePrice(req.adminID, id, basePrice);

        res.json({
            success: true,
            message: 'Base price updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error updating base price:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update base price'
        });
    }
};

// Delete service (Admin only - soft delete)
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if admin is the creator
        if (!service.createdBy.equals(req.adminID)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this service'
            });
        }

        service.isActive = false;
        await service.save();

        res.json({
            success: true,
            message: 'Service deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete service'
        });
    }
};

// Get all services (Admin view)
const getAllServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category } = req.query;
        const skip = (page - 1) * limit;

        let query = { createdBy: req.adminID };
        
        if (search) {
            query.$text = { $search: search };
        }
        
        if (category) {
            query.category = category;
        }

        const services = await Service.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'name email');

        const total = await Service.countDocuments(query);

        res.json({
            success: true,
            count: services.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: services
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
};

// Get service by ID (Admin view)
const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id)
            .populate('createdBy', 'name email')
            .populate('feedback.customer', 'name email');

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if admin is the creator
        if (!service.createdBy._id.equals(req.adminID)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this service'
            });
        }

        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service'
        });
    }
};

/**
 * PROVIDER CONTROLLERS
 */

// Get services for provider
const getServicesForProvider = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category } = req.query;
        const skip = (page - 1) * limit;

        let query = { isActive: true };
        
        if (search) {
            query.$text = { $search: search };
        }
        
        if (category) {
            query.category = category;
        }

        const services = await Service.find(query)
            .select('title category description image basePrice duration feedback averageRating')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Service.countDocuments(query);

        res.json({
            success: true,
            count: services.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: services
        });
    } catch (error) {
        console.error('Error fetching services for provider:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
};

// Get service details for provider
const getServiceDetailsForProvider = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id)
            .select('title category description image basePrice duration durationFormatted feedback averageRating')
            .populate('feedback.customer', 'name');

        if (!service || !service.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Service not found or inactive'
            });
        }

        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Error fetching service details:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch service details'
        });
    }
};

/**
 * PUBLIC CONTROLLERS
 */

// Get all active services (public)
const getActiveServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category } = req.query;
        const skip = (page - 1) * limit;

        let query = { isActive: true };
        
        if (search) {
            query.$text = { $search: search };
        }
        
        if (category) {
            query.category = category;
        }

        // First get the services without virtuals to avoid issues
        const services = await Service.find(query)
            .select('title category description image basePrice duration feedback averageRating ratingCount')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); // Convert to plain JavaScript objects

        // Manually calculate durationFormatted and ensure averageRating is correct
        const enhancedServices = services.map(service => {
            // Calculate duration formatted
            const hours = Math.floor(service.duration);
            const minutes = Math.round((service.duration - hours) * 60);
            const durationFormatted = `${hours > 0 ? `${hours} hr` : ''} ${minutes > 0 ? `${minutes} min` : ''}`.trim();

            // Calculate average rating if not already calculated
            let averageRating = service.averageRating;
            if ((!averageRating || averageRating === 0) && service.feedback && service.feedback.length > 0) {
                const sum = service.feedback.reduce((acc, curr) => acc + curr.rating, 0);
                averageRating = parseFloat((sum / service.feedback.length).toFixed(1));
            }

            return {
                ...service,
                durationFormatted,
                averageRating,
                ratingCount: service.feedback ? service.feedback.length : 0
            };
        });

        const total = await Service.countDocuments(query);

        res.json({
            success: true,
            count: enhancedServices.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: enhancedServices
        });
    } catch (error) {
        console.error('Error fetching active services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get service by ID (public)
const getPublicServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid service ID format'
            });
        }

        // First get the service with basic info
        const service = await Service.findById(id)
            .select('title category description image basePrice duration isActive averageRating ratingCount')
            .lean();

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'No service found with that ID'
            });
        }

        if (!service.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Service exists but is not active'
            });
        }

        // Get feedback from the Feedback collection for better data structure
        const Feedback = require('../models/Feedback-model');
        const feedbacks = await Feedback.find({
            'serviceFeedback.service': id
        })
        .populate('customer', 'name profilePicUrl')
        .select('serviceFeedback customer createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean();

        // Transform feedback data to match expected structure
        const transformedFeedback = feedbacks.map(feedback => ({
            _id: feedback._id,
            rating: feedback.serviceFeedback.rating,
            comment: feedback.serviceFeedback.comment || '',
            customer: feedback.customer,
            createdAt: feedback.createdAt,
            updatedAt: feedback.updatedAt || feedback.createdAt,
            isEdited: feedback.serviceFeedback.isEdited || false
        }));

        // Calculate average rating and count from actual feedback
        let averageRating = 0;
        let ratingCount = transformedFeedback.length;

        if (ratingCount > 0) {
            const sum = transformedFeedback.reduce((acc, curr) => acc + curr.rating, 0);
            averageRating = parseFloat((sum / ratingCount).toFixed(1));
        }

        // Calculate durationFormatted
        const hours = Math.floor(service.duration);
        const minutes = Math.round((service.duration - hours) * 60);
        const durationFormatted = `${hours > 0 ? `${hours} hr` : ''} ${minutes > 0 ? `${minutes} min` : ''}`.trim();

        // Update service with calculated values if they differ
        if (service.averageRating !== averageRating || service.ratingCount !== ratingCount) {
            await Service.findByIdAndUpdate(id, {
                averageRating,
                ratingCount
            });
        }

        // Prepare final response
        const responseData = {
            ...service,
            durationFormatted,
            averageRating,
            ratingCount,
            feedback: transformedFeedback
        };

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch service'
        });
    }
};

// Get services by category (public)
const getServicesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const services = await Service.findActiveByCategory(category)
            .select('title category description image basePrice duration durationFormatted averageRating')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Service.countDocuments({ category, isActive: true });

        res.json({
            success: true,
            count: services.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: services
        });
    } catch (error) {
        console.error('Error fetching services by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
};

// Bulk import services from Excel (Admin only)
const bulkImportServices = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const workbook = new excelJS.Workbook();
        const filePath = path.join(__dirname, '../uploads', req.file.filename);

        // Load the Excel file
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1); // Get first sheet

        const services = [];
        const errors = [];
        let successCount = 0;

        // Process each row
        worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
            // Skip header row
            if (rowNumber === 1) return;

            try {
                const serviceData = {
                    title: row.getCell(1).value,
                    category: row.getCell(2).value,
                    description: row.getCell(3).value,
                    basePrice: row.getCell(4).value,
                    duration: row.getCell(5).value,
                    createdBy: req.adminID,
                    isActive: true
                };

                // Validate required fields
                if (!serviceData.title || !serviceData.category || !serviceData.basePrice) {
                    throw new Error('Missing required fields');
                }

                // Validate category
                if (!['Electrical', 'AC', 'Appliance Repair', 'Other'].includes(serviceData.category)) {
                    throw new Error('Invalid category');
                }

                // Create service
                const service = await Service.create(serviceData);
                services.push(service);
                successCount++;
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    error: error.message
                });
            }
        });

        // Delete the uploaded file after processing
        fs.unlinkSync(filePath);

        return res.json({
            success: true,
            message: 'Bulk import completed',
            importedCount: successCount,
            errorCount: errors.length,
            errors,
            services
        });

    } catch (error) {
        console.error('Error in bulk import:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process bulk import'
        });
    }
};

// Export services to Excel (Admin only)
const exportServicesToExcel = async (req, res) => {
    try {
        const services = await Service.find({ createdBy: req.adminID })
            .sort({ createdAt: -1 });

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('Services');

        // Add headers
        worksheet.columns = [
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Base Price', key: 'basePrice', width: 15 },
            { header: 'Duration (hours)', key: 'duration', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // Add data rows
        services.forEach(service => {
            worksheet.addRow({
                title: service.title,
                category: service.category,
                description: service.description,
                basePrice: service.basePrice,
                duration: service.duration,
                status: service.isActive ? 'Active' : 'Inactive',
                createdAt: service.createdAt.toISOString().split('T')[0]
            });
        });

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=services.xlsx'
        );

        // Send the Excel file
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting services:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export services'
        });
    }
};

module.exports = {
    // Admin controllers
    createService,
    updateService,
    updateBasePrice,
    deleteService,
    getAllServices,
    getServiceById,
    bulkImportServices,
    exportServicesToExcel,

    // Provider controllers
    getServicesForProvider,
    getServiceDetailsForProvider,

    // Public controllers
    getActiveServices,
    getPublicServiceById,
    getServicesByCategory
};