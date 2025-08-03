// Create this file: backend/src/routes/realtime.js

const express = require('express');
const router = express.Router();
const { JobDescription, Resume, RankingResult, EmailNotification, ProcessingLog, sequelize } = require('../config/database');
const { Op } = require('sequelize');

// GET /api/agents/realtime-stats - Enhanced real-time stats from database
router.get('/realtime-stats', async (req, res) => {
  try {
    console.log('📊 Fetching real-time agent stats from database');
    
    // Get all jobs with related data
    const jobs = await JobDescription.findAll({
      include: [
        {
          model: Resume,
          as: 'resumes',
          attributes: ['id', 'processing_status', 'created_at']
        },
        {
          model: RankingResult,
          as: 'rankings',
          attributes: ['id', 'created_at']
        },
        {
          model: EmailNotification,
          as: 'notifications',
          attributes: ['id', 'status', 'sent_at']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 1000 // Limit for performance
    });

    // Get processing logs for agent activity
    const recentLogs = await ProcessingLog.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['created_at', 'DESC']],
      limit: 100
    });

    console.log(`📈 Found ${jobs.length} jobs and ${recentLogs.length} recent logs`);

    // Calculate real-time metrics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // System stats
    const systemStats = {
      totalJobs: jobs.length,
      processingJobs: jobs.filter(job => job.status === 'processing').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      totalResumes: jobs.reduce((sum, job) => sum + (job.total_resumes || 0), 0),
      processedResumes: jobs.reduce((sum, job) => sum + (job.processed_resumes || 0), 0),
      totalRankings: jobs.reduce((sum, job) => sum + (job.rankings?.length || 0), 0),
      totalEmails: jobs.filter(job => 
        job.notifications?.some(n => n.status === 'sent') || 
        job.workflow_status?.email_sent
      ).length
    };

    // Agent performance calculations
    const calculateAgentPerformance = () => {
      const recentJobs = jobs.filter(job => new Date(job.created_at) > oneDayAgo);
      const processingJobs = jobs.filter(job => job.status === 'processing');
      const completedJobs = jobs.filter(job => job.status === 'completed');

      // Comparison Agent
      const comparisonCompleted = jobs.filter(job => 
        job.workflow_status?.jd_compared || 
        job.agent_stats?.comparison_agent?.status === 'completed'
      );
      const comparisonErrors = jobs.filter(job => 
        job.agent_stats?.comparison_agent?.status === 'failed' ||
        (job.status === 'failed' && !job.workflow_status?.jd_compared)
      ).length;
      
      const comparisonActive = processingJobs.filter(job => 
        job.agent_stats?.comparison_agent?.status === 'processing' ||
        (job.status === 'processing' && !job.workflow_status?.jd_compared)
      );

      // Ranking Agent
      const rankingCompleted = jobs.filter(job => 
        job.workflow_status?.profiles_ranked || 
        job.agent_stats?.ranking_agent?.status === 'completed'
      );
      const rankingErrors = jobs.filter(job => 
        job.agent_stats?.ranking_agent?.status === 'failed' ||
        (job.status === 'failed' && job.workflow_status?.jd_compared && !job.workflow_status?.profiles_ranked)
      ).length;
      
      const rankingActive = processingJobs.filter(job => 
        job.agent_stats?.ranking_agent?.status === 'processing' ||
        (job.status === 'processing' && job.workflow_status?.jd_compared && !job.workflow_status?.profiles_ranked)
      );

      // Communication Agent
      const emailCompleted = jobs.filter(job => 
        job.workflow_status?.email_sent || 
        job.agent_stats?.communication_agent?.status === 'completed' ||
        job.notifications?.some(n => n.status === 'sent')
      );
      const emailErrors = jobs.filter(job => 
        job.agent_stats?.communication_agent?.status === 'failed' ||
        job.notifications?.some(n => n.status === 'failed') ||
        (job.status === 'failed' && job.workflow_status?.profiles_ranked && !job.workflow_status?.email_sent)
      ).length;
      
      const emailActive = processingJobs.filter(job => 
        job.agent_stats?.communication_agent?.status === 'processing' ||
        (job.status === 'processing' && job.workflow_status?.profiles_ranked && !job.workflow_status?.email_sent)
      );

      // Calculate processing times
      const getAvgProcessingTime = (completedJobs) => {
        const times = completedJobs
          .filter(job => job.processing_started_at && job.processing_completed_at)
          .map(job => new Date(job.processing_completed_at) - new Date(job.processing_started_at));
        return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
      };

      // Determine current status
      const getAgentStatus = (activeJobs, completedJobs) => {
        if (activeJobs.length > 0) return 'processing';
        
        const recentCompleted = completedJobs.filter(job => 
          job.processing_completed_at && 
          new Date(job.processing_completed_at) > oneHourAgo
        );
        
        if (recentCompleted.length > 0) return 'completed';
        return 'idle';
      };

      return {
        comparisonAgent: {
          status: getAgentStatus(comparisonActive, comparisonCompleted),
          successRate: jobs.length > 0 ? Math.round((comparisonCompleted.length / jobs.length) * 100) : 0,
          totalTasks: jobs.length,
          completedTasks: comparisonCompleted.length,
          errors: comparisonErrors,
          latency: getAvgProcessingTime(comparisonCompleted),
          queue: comparisonActive.length,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          uptime: Date.now() - new Date('2024-01-01').getTime(),
          processedResumes: systemStats.processedResumes
        },
        rankingAgent: {
          status: getAgentStatus(rankingActive, rankingCompleted),
          successRate: jobs.length > 0 ? Math.round((rankingCompleted.length / jobs.length) * 100) : 0,
          totalTasks: jobs.length,
          completedTasks: rankingCompleted.length,
          errors: rankingErrors,
          latency: getAvgProcessingTime(rankingCompleted),
          queue: rankingActive.length,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          uptime: Date.now() - new Date('2024-01-01').getTime(),
          rankedProfiles: systemStats.totalRankings
        },
        communicationAgent: {
          status: getAgentStatus(emailActive, emailCompleted),
          successRate: jobs.length > 0 ? Math.round((emailCompleted.length / jobs.length) * 100) : 0,
          totalTasks: jobs.length,
          completedTasks: emailCompleted.length,
          errors: emailErrors,
          latency: getAvgProcessingTime(emailCompleted),
          queue: emailActive.length,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          uptime: Date.now() - new Date('2024-01-01').getTime(),
          emailsSent: systemStats.totalEmails
        }
      };
    };

    const agentStats = calculateAgentPerformance();

    // Get recent activity from processing logs
    const recentActivity = recentLogs.slice(0, 10).map(log => ({
      id: log.id,
      agent: log.agent_name,
      status: log.status,
      message: log.message,
      timestamp: log.created_at,
      data: log.data
    }));

    const response = {
      systemStats,
      agentStats,
      recentActivity,
      timestamp: now,
      databaseTables: {
        job_descriptions: systemStats.totalJobs,
        resumes: systemStats.totalResumes,
        ranking_results: systemStats.totalRankings,
        email_notifications: systemStats.totalEmails,
        processing_logs: recentLogs.length
      }
    };

    console.log('✅ Real-time stats response prepared');
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching real-time stats:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to fetch real-time agent statistics',
      timestamp: new Date()
    });
  }
});

// GET /api/agents/system-health - System health check with database stats
router.get('/system-health', async (req, res) => {
  try {
    // Database connection test
    await sequelize.authenticate();

    // Get table counts directly from database
    const [jobCount] = await sequelize.query('SELECT COUNT(*) as count FROM job_descriptions');
    const [resumeCount] = await sequelize.query('SELECT COUNT(*) as count FROM resumes');
    const [rankingCount] = await sequelize.query('SELECT COUNT(*) as count FROM ranking_results');
    const [emailCount] = await sequelize.query('SELECT COUNT(*) as count FROM email_notifications');
    const [logCount] = await sequelize.query('SELECT COUNT(*) as count FROM processing_logs');

    // Get recent activity
    const recentJobs = await JobDescription.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      attributes: ['id', 'status', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      status: 'healthy',
      database: {
        connected: true,
        tables: {
          job_descriptions: parseInt(jobCount[0].count),
          resumes: parseInt(resumeCount[0].count),
          ranking_results: parseInt(rankingCount[0].count),
          email_notifications: parseInt(emailCount[0].count),
          processing_logs: parseInt(logCount[0].count)
        }
      },
      recentActivity: {
        jobsLastHour: recentJobs.length,
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          status: job.status,
          created: job.created_at
        }))
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ System health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      database: { connected: false },
      timestamp: new Date()
    });
  }
});

// GET /api/agents/activity-logs - Get recent processing logs
router.get('/activity-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const hours = parseInt(req.query.hours) || 24;

    const logs = await ProcessingLog.findAll({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - hours * 60 * 60 * 1000)
        }
      },
      include: [{
        model: JobDescription,
        as: 'job',
        attributes: ['id', 'title', 'status'],
        required: false
      }],
      order: [['created_at', 'DESC']],
      limit
    });

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        jobId: log.job_id,
        jobTitle: log.job?.title,
        agent: log.agent_name,
        status: log.status,
        message: log.message,
        data: log.data,
        timestamp: log.created_at
      })),
      total: logs.length,
      timeRange: `${hours} hours`,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error fetching activity logs:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date()
    });
  }
});

module.exports = router;
