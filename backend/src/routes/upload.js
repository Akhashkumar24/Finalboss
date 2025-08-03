const express = require('express');
const fileUpload = require('express-fileupload');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Configure file upload middleware
router.use(fileUpload({
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 100 // Maximum 100 files
  },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded',
  uploadTimeout: 60000, // 60 seconds timeout
  useTempFiles: true,
  tempFileDir: '/tmp/',
  safeFileNames: true,
  preserveExtension: true
}));

// Upload resumes
router.post('/resumes', uploadController.uploadResumes);

// Get upload status
router.get('/status/:jobId', uploadController.getUploadStatus);

module.exports = router;