const express = require('express');
const router = express.Router();

// In-memory agent statistics (you can expand this based on your needs)
let agentStats = {
  comparisonAgent: {
    status: 'idle',
    queue: 0,
    latency: 2300,
    errors: 0,
    totalTasks: 0,
    completedTasks: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    successRate: 95
  },
  rankingAgent: {
    status: 'idle',
    queue: 0,
    latency: 3100,
    errors: 0,
    totalTasks: 0,
    completedTasks: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    successRate: 97
  },
  communicationAgent: {
    status: 'idle',
    queue: 0,
    latency: 1200,
    errors: 0,
    totalTasks: 0,
    completedTasks: 0,
    startTime: Date.now(),
    lastActivity: Date.now(),
    successRate: 99
  }
};

// GET /api/agents/stats - Returns real-time agent statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Agent stats endpoint called');
    
    // You can enhance this with real database queries
    // For now, let's get basic stats from your existing data
    
    let systemStats = {
      totalJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalResumes: 0
    };

    // If you have database models, uncomment and adjust:
    /*
    const { JobDescription, Resume, JobApplication } = require('../config/database');
    
    try {
      // Get job statistics from last 24 hours
      const jobs = await JobDescription.findAll({
        attributes: ['id', 'status'],
        where: {
          created_at: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      
      const applications = await JobApplication.findAll({
        attributes: ['status'],
        where: {
          created_at: {
            [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });
      
      systemStats = {
        totalJobs: jobs.length,
        processingJobs: applications.filter(app => app.status === 'processing').length,
        completedJobs: applications.filter(app => app.status === 'completed').length,
        failedJobs: applications.filter(app => app.status === 'failed').length,
        totalResumes: await Resume.count()
      };
      
      console.log('📈 Real database stats loaded:', systemStats);
      
    } catch (dbError) {
      console.warn('⚠️ Database query failed, using mock stats:', dbError.message);
      // Use mock data if database fails
      systemStats = {
        totalJobs: 156,
        processingJobs: Math.floor(Math.random() * 15),
        completedJobs: 134 + Math.floor(Math.random() * 20),
        failedJobs: 10 + Math.floor(Math.random() * 5),
        totalResumes: 4823 + Math.floor(Math.random() * 100)
      };
    }
    */
    
    // For demo purposes, generate realistic mock data
    systemStats = {
      totalJobs: 156 + Math.floor(Math.random() * 20),
      processingJobs: Math.floor(Math.random() * 15),
      completedJobs: 134 + Math.floor(Math.random() * 50),
      failedJobs: 10 + Math.floor(Math.random() * 8),
      totalResumes: 4823 + Math.floor(Math.random() * 200)
    };

    // Update agent statuses based on system activity with some randomization
    const now = Date.now();
    
    if (systemStats.processingJobs > 0) {
      // Randomly assign processing status
      const agents = Object.keys(agentStats);
      const processingAgent = agents[Math.floor(Math.random() * agents.length)];
      
      agentStats[processingAgent].status = 'processing';
      agentStats[processingAgent].queue = Math.floor(systemStats.processingJobs * (0.2 + Math.random() * 0.6));
      
      // Other agents might be idle or completed
      agents.forEach(agent => {
        if (agent !== processingAgent) {
          agentStats[agent].status = Math.random() > 0.7 ? 'idle' : 'completed';
          agentStats[agent].queue = Math.floor(Math.random() * 3);
        }
      });
    } else {
      // All agents idle when no processing jobs
      Object.keys(agentStats).forEach(agent => {
        agentStats[agent].status = 'idle';
        agentStats[agent].queue = 0;
      });
    }

    // Add some realistic variations to metrics
    Object.keys(agentStats).forEach(agent => {
      // Simulate task completion
      if (Math.random() > 0.7) {
        agentStats[agent].completedTasks += Math.floor(Math.random() * 3);
        agentStats[agent].totalTasks += Math.floor(Math.random() * 3);
      }
      
      // Occasionally add errors
      if (Math.random() > 0.95) {
        agentStats[agent].errors += 1;
      }
      
      // Update success rate based on completed vs total tasks
      if (agentStats[agent].totalTasks > 0) {
        const baseRate = agentStats[agent] === agentStats.comparisonAgent ? 95 : 
                        agentStats[agent] === agentStats.rankingAgent ? 97 : 99;
        const variation = (Math.random() - 0.5) * 4; // ±2% variation
        agentStats[agent].successRate = Math.max(85, Math.min(100, baseRate + variation));
      }
      
      // Calculate uptime
      agentStats[agent].uptime = now - agentStats[agent].startTime;
      agentStats[agent].lastActivity = now - Math.floor(Math.random() * 300000); // Within last 5 minutes
      
      // Add some latency variation
      const baseLat = agent === 'comparisonAgent' ? 2300 : 
                    agent === 'rankingAgent' ? 3100 : 1200;
      agentStats[agent].latency = baseLat + Math.floor((Math.random() - 0.5) * 800);
    });

    const response = {
      comparisonAgent: {
        status: agentStats.comparisonAgent.status,
        queue: agentStats.comparisonAgent.queue,
        latency: agentStats.comparisonAgent.latency,
        errors: agentStats.comparisonAgent.errors,
        totalTasks: agentStats.comparisonAgent.totalTasks + systemStats.completedJobs,
        completedTasks: agentStats.comparisonAgent.completedTasks + Math.floor(systemStats.completedJobs * 0.4),
        successRate: Math.round(agentStats.comparisonAgent.successRate),
        lastActivity: agentStats.comparisonAgent.lastActivity,
        uptime: agentStats.comparisonAgent.uptime
      },
      rankingAgent: {
        status: agentStats.rankingAgent.status,
        queue: agentStats.rankingAgent.queue,
        latency: agentStats.rankingAgent.latency,
        errors: agentStats.rankingAgent.errors,
        totalTasks: agentStats.rankingAgent.totalTasks + systemStats.completedJobs,
        completedTasks: agentStats.rankingAgent.completedTasks + Math.floor(systemStats.completedJobs * 0.3),
        successRate: Math.round(agentStats.rankingAgent.successRate),
        lastActivity: agentStats.rankingAgent.lastActivity,
        uptime: agentStats.rankingAgent.uptime
      },
      communicationAgent: {
        status: agentStats.communicationAgent.status,
        queue: agentStats.communicationAgent.queue,
        latency: agentStats.communicationAgent.latency,
        errors: agentStats.communicationAgent.errors,
        totalTasks: agentStats.communicationAgent.totalTasks + systemStats.completedJobs,
        completedTasks: agentStats.communicationAgent.completedTasks + Math.floor(systemStats.completedJobs * 0.3),
        successRate: Math.round(agentStats.communicationAgent.successRate),
        lastActivity: agentStats.communicationAgent.lastActivity,
        uptime: agentStats.communicationAgent.uptime
      },
      systemStats: systemStats,
      timestamp: Date.now()
    };

    console.log('✅ Sending agent stats response');
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching agent stats:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to fetch agent statistics',
      timestamp: Date.now()
    });
  }
});

// GET /api/agents/status - Simple status check
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    agents: {
      comparisonAgent: agentStats.comparisonAgent.status,
      rankingAgent: agentStats.rankingAgent.status,
      communicationAgent: agentStats.communicationAgent.status
    },
    timestamp: Date.now()
  });
});

// Helper functions to update agent stats (call these from your job processing)
const updateAgentStatus = (agentName, status, additionalData = {}) => {
  if (agentStats[agentName]) {
    agentStats[agentName] = {
      ...agentStats[agentName],
      status,
      lastActivity: Date.now(),
      ...additionalData
    };
    console.log(`🔄 Agent ${agentName} status updated to: ${status}`);
  }
};

const recordTaskComplete = (agentName, processingTime) => {
  if (agentStats[agentName]) {
    agentStats[agentName].completedTasks++;
    agentStats[agentName].totalTasks++;
    agentStats[agentName].latency = processingTime;
    agentStats[agentName].lastActivity = Date.now();
    
    // Calculate success rate
    const successRate = (agentStats[agentName].completedTasks / agentStats[agentName].totalTasks) * 100;
    agentStats[agentName].successRate = Math.round(successRate);
    
    console.log(`✅ Task completed for ${agentName}: ${agentStats[agentName].completedTasks}/${agentStats[agentName].totalTasks}`);
  }
};

const recordTaskError = (agentName, error) => {
  if (agentStats[agentName]) {
    agentStats[agentName].errors++;
    agentStats[agentName].totalTasks++;
    agentStats[agentName].status = 'error';
    agentStats[agentName].lastActivity = Date.now();
    
    console.log(`❌ Error recorded for ${agentName}: ${error}`);
  }
};

// Debug endpoint to manually update agent stats (for testing)
router.post('/debug/update/:agentName', (req, res) => {
  const { agentName } = req.params;
  const { status, ...otherData } = req.body;
  
  if (!agentStats[agentName]) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  updateAgentStatus(agentName, status, otherData);
  res.json({ 
    message: `Agent ${agentName} updated successfully`, 
    agent: agentStats[agentName] 
  });
});

// Export both router and helper functions
module.exports = router;
module.exports.updateAgentStatus = updateAgentStatus;
module.exports.recordTaskComplete = recordTaskComplete;
module.exports.recordTaskError = recordTaskError;