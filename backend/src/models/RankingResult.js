const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RankingResult = sequelize.define('RankingResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    job_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    resume_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    overall_score: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    skills_match: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    experience_score: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    contextual_relevance: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    strengths: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    gaps: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    tableName: 'ranking_results'
  });

  return RankingResult;
};