const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Resume = sequelize.define('Resume', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    job_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'job_descriptions',
        key: 'id'
      }
    },
    candidate_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    candidate_email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    original_filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_type: {
      type: DataTypes.ENUM('pdf', 'docx', 'txt', 'csv'),
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    extracted_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    skills: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    experience_years: {
      type: DataTypes.STRING,
      allowNull: true
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: true
    },
    education: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    contact_info: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    processing_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gemini_analysis: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'resumes',
    indexes: [
      {
        fields: ['job_id']
      },
      {
        fields: ['processing_status']
      },
      {
        fields: ['candidate_email']
      },
      {
        fields: ['file_type']
      }
    ]
  });

  // Instance methods
  Resume.prototype.updateProcessingStatus = function(status, error = null) {
    this.processing_status = status;
    if (status === 'completed') {
      this.processed_at = new Date();
    }
    if (error) {
      this.processing_error = error;
    }
    return this.save();
  };

  Resume.prototype.setGeminiAnalysis = function(analysis) {
    this.gemini_analysis = analysis;
    return this.save();
  };

  Resume.prototype.updateExtractedData = function(data) {
    if (data.text) this.extracted_text = data.text;
    if (data.skills) this.skills = data.skills;
    if (data.experience) this.experience_years = data.experience;
    if (data.domain) this.domain = data.domain;
    if (data.education) this.education = data.education;
    if (data.contact) this.contact_info = data.contact;
    return this.save();
  };

  // Class methods
  Resume.getByJobId = function(jobId, options = {}) {
    return this.findAll({
      where: { job_id: jobId },
      ...options
    });
  };

  Resume.getProcessedByJobId = function(jobId) {
    return this.findAll({
      where: { 
        job_id: jobId,
        processing_status: 'completed'
      },
      include: ['ranking']
    });
  };

  return Resume;
};