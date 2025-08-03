const path = require('path');
const fs = require('fs').promises;
const { JobDescription, Resume } = require('../config/database');
const fileProcessor = require('../services/fileProcessor');
const { v4: uuidv4 } = require('uuid');

class UploadController {
  async uploadResumes(req, res) {
    try {
      const { jobDescription, requestorEmail } = req.body;
      
      if (!jobDescription || !requestorEmail) {
        return res.status(400).json({
          error: 'Job description and requestor email are required'
        });
      }

      if (!req.files || !req.files.resumes) {
        return res.status(400).json({
          error: 'No resume files uploaded'
        });
      }

      // Ensure resumes is an array
      const files = Array.isArray(req.files.resumes) 
        ? req.files.resumes 
        : [req.files.resumes];

      // Validate files
      const validationErrors = [];
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.csv'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      files.forEach((file, index) => {
        const ext = path.extname(file.name).toLowerCase();
        if (!allowedTypes.includes(ext)) {
          validationErrors.push(`File ${index + 1}: Unsupported file type ${ext}`);
        }
        if (file.size > maxSize) {
          validationErrors.push(`File ${index + 1}: File size exceeds 10MB limit`);
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'File validation failed',
          details: validationErrors
        });
      }

      // Create job description record
      const job = await JobDescription.create({
        title: extractTitleFromJD(jobDescription),
        content: jobDescription,
        requestor_email: requestorEmail,
        total_resumes: files.length,
        status: 'pending'
      });

      // Process and save files
      const uploadDir = path.join(__dirname, '../../uploads', job.id);
      await fs.mkdir(uploadDir, { recursive: true });

      const savedResumes = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = uuidv4();
        const ext = path.extname(file.name);
        const filename = `${fileId}${ext}`;
        const filepath = path.join(uploadDir, filename);

        try {
          // Save file to disk
          await file.mv(filepath);

          // Process file content
          const processedData = await fileProcessor.processFile(filepath, file.name);

          // Save resume record
          const resume = await Resume.create({
            job_id: job.id,
            candidate_name: processedData.candidateName || `Candidate ${i + 1}`,
            candidate_email: processedData.email || null,
            original_filename: file.name,
            file_path: filepath,
            file_type: ext.substring(1).toLowerCase(),
            file_size: file.size,
            extracted_text: processedData.extractedText,
            skills: processedData.skills || [],
            experience_years: processedData.experience || null,
            domain: processedData.domain || null,
            contact_info: processedData.contactInfo || {},
            processing_status: 'completed',
            processed_at: new Date()
          });

          savedResumes.push({
            id: resume.id,
            candidateName: resume.candidate_name,
            originalFilename: resume.original_filename,
            skills: resume.skills,
            experience: resume.experience_years
          });

        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          
          // Save failed resume record
          await Resume.create({
            job_id: job.id,
            candidate_name: `Failed: ${file.name}`,
            original_filename: file.name,
            file_path: filepath,
            file_type: ext.substring(1).toLowerCase(),
            file_size: file.size,
            processing_status: 'failed',
            processing_error: fileError.message
          });
        }
      }

      // Update job with processed count
      await job.update({
        processed_resumes: savedResumes.length,
        status: savedResumes.length > 0 ? 'pending' : 'failed'
      });

      res.status(201).json({
        success: true,
        message: `Successfully uploaded and processed ${savedResumes.length} of ${files.length} files`,
        jobId: job.id,
        processedResumes: savedResumes,
        totalFiles: files.length,
        successfulFiles: savedResumes.length
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'File upload failed',
        message: error.message
      });
    }
  }

  async getUploadStatus(req, res) {
    try {
      const { jobId } = req.params;
      
      const job = await JobDescription.findByPk(jobId, {
        include: [{
          association: 'resumes',
          attributes: ['id', 'candidate_name', 'original_filename', 'processing_status', 'file_type']
        }]
      });

      if (!job) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      const processedCount = job.resumes.filter(r => r.processing_status === 'completed').length;
      const failedCount = job.resumes.filter(r => r.processing_status === 'failed').length;

      res.json({
        jobId: job.id,
        status: job.status,
        totalResumes: job.total_resumes,
        processedResumes: processedCount,
        failedResumes: failedCount,
        files: job.resumes.map(resume => ({
          id: resume.id,
          name: resume.original_filename,
          candidateName: resume.candidate_name,
          status: resume.processing_status,
          fileType: resume.file_type
        }))
      });

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'Failed to get upload status',
        message: error.message
      });
    }
  }
}

// Helper function - moved outside the class
function extractTitleFromJD(jobDescription) {
  const lines = jobDescription.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('job title:')) {
      return trimmed.substring(10).trim();
    }
    if (trimmed.length > 10 && trimmed.length < 100) {
      return trimmed;
    }
  }
  return 'Untitled Position';
}

module.exports = new UploadController();