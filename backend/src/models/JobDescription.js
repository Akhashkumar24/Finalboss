const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobDescription = sequelize.define('JobDescription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [50, 10000]
      }
    },
    requirements: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    requestor_email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    processing_started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processing_completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_resumes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    processed_resumes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    top_matches_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    workflow_status: {
      type: DataTypes.JSONB,
      defaultValue: {
        jd_compared: false,
        profiles_ranked: false,
        email_sent: false
      }
    },
    agent_stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        comparison_agent: { status: 'idle', processed: 0, errors: 0 },
        ranking_agent: { status: 'idle', processed: 0, errors: 0 },
        communication_agent: { status: 'idle', processed: 0, errors: 0 }
      }
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'job_descriptions',
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['requestor_email']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // Instance methods
  JobDescription.prototype.updateStatus = function(status, errorMessage = null) {
    this.status = status;
    if (status === 'processing' && !this.processing_started_at) {
      this.processing_started_at = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      this.processing_completed_at = new Date();
    }
    if (errorMessage) {
      this.error_message = errorMessage;
    }
    return this.save();
  };

  JobDescription.prototype.updateWorkflowStatus = function(updates) {
    this.workflow_status = { ...this.workflow_status, ...updates };
    return this.save();
  };

  JobDescription.prototype.updateAgentStats = function(agent, stats) {
    this.agent_stats = {
      ...this.agent_stats,
      [agent]: { ...this.agent_stats[agent], ...stats }
    };
    return this.save();
  };

  JobDescription.prototype.incrementProcessedResumes = function() {
    this.processed_resumes += 1;
    return this.save();
  };

  return JobDescription;
};