const { Sequelize } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'resume_matcher',
  username: process.env.DB_USER || 'techtitans',
  password: process.env.DB_PASSWORD || '123',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    paranoid: true // Soft deletes
  }
});

// Import models
const JobDescription = require('../models/JobDescription')(sequelize);
const Resume = require('../models/Resume')(sequelize);
const ProcessingLog = require('../models/ProcessingLog')(sequelize);
const RankingResult = require('../models/RankingResult')(sequelize);
const EmailNotification = require('../models/EmailNotification')(sequelize);

// Define associations
JobDescription.hasMany(Resume, { foreignKey: 'job_id', as: 'resumes' });
Resume.belongsTo(JobDescription, { foreignKey: 'job_id', as: 'job' });

JobDescription.hasMany(ProcessingLog, { foreignKey: 'job_id', as: 'logs' });
ProcessingLog.belongsTo(JobDescription, { foreignKey: 'job_id', as: 'job' });

JobDescription.hasMany(RankingResult, { foreignKey: 'job_id', as: 'rankings' });
RankingResult.belongsTo(JobDescription, { foreignKey: 'job_id', as: 'job' });

Resume.hasOne(RankingResult, { foreignKey: 'resume_id', as: 'ranking' });
RankingResult.belongsTo(Resume, { foreignKey: 'resume_id', as: 'resume' });

JobDescription.hasMany(EmailNotification, { foreignKey: 'job_id', as: 'notifications' });
EmailNotification.belongsTo(JobDescription, { foreignKey: 'job_id', as: 'job' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  JobDescription,
  Resume,
  ProcessingLog,
  RankingResult,
  EmailNotification
};