const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
});

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    subcategories: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Subcategory'
        }
    ]
});

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    }
});

const SettingsSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    banners: [bannerSchema],
    categories: [categorySchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = {
    Settings: mongoose.model('Settings', SettingsSchema),
    Category: mongoose.model('Category', categorySchema),
    Subcategory: mongoose.model('Subcategory', subcategorySchema)
};
