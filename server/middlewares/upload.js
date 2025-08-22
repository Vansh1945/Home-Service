const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const ensureUploadDir = (folder) => {
  const dir = path.join(__dirname, `../uploads/${folder}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Custom storage configuration
const createStorage = (folder) => {
  ensureUploadDir(folder);
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, `../uploads/${folder}`));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueId = uuidv4();
      cb(null, `${folder}-${uniqueId}${ext}`);
    }
  });
};

// File type validation
const validateFileType = (file, allowedTypes) => {
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    error.code = 'LIMIT_FILE_TYPES';
    return error;
  }
  return null;
};

// File size validation
const validateFileSize = (file, maxSize) => {
  if (file.size > maxSize) {
    const error = new Error(`File too large. Max size is ${maxSize/1024/1024}MB`);
    error.code = 'LIMIT_FILE_SIZE';
    return error;
  }
  return null;
};

// PDF filter (only PDF allowed)
const pdfFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  const error = validateFileType(file, allowedTypes) || 
               validateFileSize(file, 5 * 1024 * 1024); // 5MB
  cb(error || null, !error);
};

// Image filter (JPG/JPEG/PNG allowed)
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const error = validateFileType(file, allowedTypes) || 
               validateFileSize(file, 5 * 1024 * 1024); // 5MB
  cb(error || null, !error);
};

// Combined upload instance for multiple files
const upload = multer({
  storage: createStorage('providerProfile'),
  fileFilter: (req, file, cb) => {
    const config = {
      'profilePic': {
        types: ['image/jpeg', 'image/png'],
        maxSize: 3 * 1024 * 1024 // 3MB
      },
      'resume': {
        types: ['application/pdf'],
        maxSize: 5 * 1024 * 1024 // 5MB
      },
      'passbookImage': {
        types: ['image/jpeg', 'image/png'],
        maxSize: 3 * 1024 * 1024 // 3MB
      },
      'servicesFile': {
        types: ['application/pdf'],
        maxSize: 5 * 1024 * 1024 // 5MB
      },
      'image': { // For service images
        types: ['image/jpeg', 'image/png'],
        maxSize: 3 * 1024 * 1024 // 3MB
      },
      'complaintImages': {
        types: ['image/jpeg', 'image/png'],
        maxSize: 5 * 1024 * 1024 // 5MB
      }
    };

    const fieldConfig = config[file.fieldname];
    
    if (!fieldConfig) {
      return cb(new Error(`Unexpected field: ${file.fieldname}`));
    }

    const typeError = validateFileType(file, fieldConfig.types);
    if (typeError) return cb(typeError);
    
    const sizeError = validateFileSize(file, fieldConfig.maxSize);
    if (sizeError) return cb(sizeError);
    
    cb(null, true);
  }
});

// Individual upload instances for specific routes
const uploadProfilePic = multer({
  storage: createStorage('profilePics'),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

const uploadResume = multer({
  storage: createStorage('resume'),
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadServiceImage = multer({
  storage: createStorage('serviceImage'),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

const uploadComplaintImage = multer({
  storage: createStorage('complaintImage'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadPassbookImg = multer({
  storage: createStorage('passbookImage'),
  fileFilter: imageFilter,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});

const uploadServicesFile = multer({
  storage: createStorage('servicesFile'),
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File too large' 
        : err.code === 'LIMIT_FILE_TYPES'
          ? 'Invalid file type'
          : 'File upload error'
    });
  } else if (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  next();
};

// Utility to delete files
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

module.exports = {
  upload, // For multiple file uploads
  uploadProfilePic,
  uploadResume,
  uploadServiceImage,
  uploadComplaintImage,
  uploadPassbookImg,
  uploadServicesFile,
  handleUploadErrors,
  deleteFile
};