const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProcessingLog = sequelize.define('ProcessingLog', {
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
    agent_name: {
      type: DataTypes.ENUM('comparison', 'ranking', 'communication', 'system'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('started', 'completed', 'failed'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'processing_logs',
    timestamps: true,
    underscored: true,
    paranoid: true
  });

  ProcessingLog.associate = (models) => {
    ProcessingLog.belongsTo(models.JobDescription, {
      foreignKey: 'job_id',
      as: 'job'
    });
  };

  return ProcessingLog;
};