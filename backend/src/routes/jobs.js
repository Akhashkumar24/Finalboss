// Enhanced jobs.js with agent statistics integration
const enhancedJobsRouter = `
const express = require('express');
const { JobDescription, Resume, RankingResult } = require('../config/database');
const { agentStatsHelpers } = require('./agents');
const router = express.Router();

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await JobDescription.findAll({
      include: ['resumes'],
      order: [['created_at', 'DESC']]
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job status with real-time agent tracking
router.get('/:jobId/status', async (req, res) => {
  try {
    const job = await JobDescription.findByPk(req.params.jobId, {
      include: ['resumes', 'rankings']
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get current agent statistics
    const currentAgentStats = agentStatsHelpers.getAgentStats();

    res.json({
      id: job.id,
      status: job.status,
      workflowStatus: job.workflow_status,
      totalResumes: job.total_resumes,
      processedResumes: job.processed_resumes,
      agentStats: {
        comparisonAgent: {
          status: currentAgentStats.comparisonAgent.status,
          queue: currentAgentStats.comparisonAgent.queue,
          processing: job.status === 'processing' && currentAgentStats.comparisonAgent.queue > 0
        },
        rankingAgent: {
          status: currentAgentStats.rankingAgent.status,
          queue: currentAgentStats.rankingAgent.queue,
          processing: job.status === 'processing' && currentAgentStats.rankingAgent.queue > 0
        },
        communicationAgent: {
          status: currentAgentStats.communicationAgent.status,
          queue: currentAgentStats.communicationAgent.queue,
          processing: job.status === 'processing' && currentAgentStats.communicationAgent.queue > 0
        }
      },
      timestamps: {
        created: job.created_at,
        processingStarted: job.processing_started_at,
        processingCompleted: job.processing_completed_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start processing job with agent tracking
router.post('/:jobId/process', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await JobDescription.findByPk(jobId, {
      include: ['resumes']
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Job cannot be processed', 
        message: \`Job status is \${job.status}. Only pending jobs can be processed.\` 
      });
    }

    if (!job.resumes || job.resumes.length === 0) {
      return res.status(400).json({ 
        error: 'No resumes found for this job' 
      });
    }

    // Update job status to processing
    await job.update({ 
      status: 'processing',
      processing_started_at: new Date()
    });

    // Record task start for all agents
    agentStatsHelpers.recordTaskStart('comparisonAgent');
    agentStatsHelpers.recordTaskStart('rankingAgent');
    agentStatsHelpers.recordTaskStart('communicationAgent');

    // Simulate job processing (replace with actual AgentOrchestrator)
    processJobWithTracking(job);

    res.json({
      success: true,
      message: 'Job processing started with agent tracking',
      jobId: job.id,
      status: 'processing',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Process start error:', error);
    
    // Record error for all agents
    agentStatsHelpers.recordTaskError('comparisonAgent', error);
    agentStatsHelpers.recordTaskError('rankingAgent', error);
    agentStatsHelpers.recordTaskError('communicationAgent', error);
    
    res.status(500).json({ error: error.message });
  }
});

// Simulate job processing with agent tracking
async function processJobWithTracking(job) {
  try {
    const startTime = Date.now();
    
    // Simulate comparison agent work
    agentStatsHelpers.updateAgentStatus('comparisonAgent', 'processing');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    agentStatsHelpers.recordTaskComplete('comparisonAgent', 2000);
    
    // Simulate ranking agent work
    agentStatsHelpers.updateAgentStatus('rankingAgent', 'processing');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing time
    agentStatsHelpers.recordTaskComplete('rankingAgent', 3000);
    
    // Simulate communication agent work
    agentStatsHelpers.updateAgentStatus('communicationAgent', 'processing');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    agentStatsHelpers.recordTaskComplete('communicationAgent', 1000);
    
    // Update job as completed
    await job.update({ 
      status: 'completed',
      processing_completed_at: new Date()
    });
    
    console.log(\`Job \${job.id} completed successfully with agent tracking\`);
    
  } catch (error) {
    console.error('Job processing failed:', error);
    
    // Record error for all agents
    agentStatsHelpers.recordTaskError('comparisonAgent', error);
    agentStatsHelpers.recordTaskError('rankingAgent', error);
    agentStatsHelpers.recordTaskError('communicationAgent', error);
    
    await job.update({ 
      status: 'failed', 
      error_message: error.message,
      processing_completed_at: new Date()
    });
  }
}

// Get job results
router.get('/:jobId/results', async (req, res) => {
  try {
    const job = await JobDescription.findByPk(req.params.jobId, {
      include: [
        {
          association: 'rankings',
          include: ['resume'],
          order: [['rank', 'ASC']]
        }
      ]
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Job not completed yet',
        status: job.status 
      });
    }

    const results = {
      jobId: job.id,
      status: job.status,
      totalCandidates: job.total_resumes,
      rankedProfiles: job.rankings ? job.rankings.map(ranking => ({
        rank: ranking.rank,
        profileId: ranking.resume_id,
        profile: {
          id: ranking.resume.id,
          name: ranking.resume.candidate_name,
          email: ranking.resume.candidate_email,
          skills: ranking.resume.skills,
          experience: ranking.resume.experience_years,
          domain: ranking.resume.domain
        },
        matchScore: Math.round(ranking.overall_score),
        skillsMatch: Math.round(ranking.skills_match),
        experienceScore: Math.round(ranking.experience_score),
        contextualRelevance: Math.round(ranking.contextual_relevance),
        explanation: ranking.explanation,
        strengths: ranking.strengths,
        gaps: ranking.gaps
      })) : [],
      topMatches: job.rankings ? job.rankings.slice(0, 3).map(ranking => ({
        rank: ranking.rank,
        profile: {
          name: ranking.resume.candidate_name,
          email: ranking.resume.candidate_email,
          skills: ranking.resume.skills,
          experience: ranking.resume.experience_years,
          domain: ranking.resume.domain
        },
        score: Math.round(ranking.overall_score),
        skillsMatch: Math.round(ranking.skills_match),
        experienceScore: Math.round(ranking.experience_score),
        contextualRelevance: Math.round(ranking.contextual_relevance),
        explanation: ranking.explanation,
        strengths: ranking.strengths,
        gaps: ranking.gaps
      })) : [],
      timestamp: job.processing_completed_at
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
`;

console.log('Enhanced backend routes with real agent statistics tracking loaded');
console.log('Routes available:');
console.log('- GET /api/agents/stats - Real-time agent statistics');
console.log('- GET /api/agents/stats/:agentName - Detailed agent metrics');
console.log('- POST /api/agents/reset-stats - Reset statistics');
console.log('- Enhanced job routes with agent tracking integration');