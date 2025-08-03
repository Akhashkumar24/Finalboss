const express = require('express');
const { JobDescription, Resume, RankingResult } = require('../config/database');
const AgentOrchestrator = require('../agents/AgentOrchestrator');
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

// Get job status
router.get('/:jobId/status', async (req, res) => {
  try {
    const job = await JobDescription.findByPk(req.params.jobId, {
      include: ['resumes', 'rankings']
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      status: job.status,
      workflowStatus: job.workflow_status,
      agentStats: job.agent_stats,
      totalResumes: job.total_resumes,
      processedResumes: job.processed_resumes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start processing job
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
        message: `Job status is ${job.status}. Only pending jobs can be processed.` 
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

    // Start the agent orchestrator
    const orchestrator = new AgentOrchestrator();
    
    // Don't await this - let it run in background
    orchestrator.processJob(job).catch(error => {
      console.error('Job processing failed:', error);
      job.update({ 
        status: 'failed', 
        error_message: error.message,
        processing_completed_at: new Date()
      });
    });

    res.json({
      success: true,
      message: 'Job processing started',
      jobId: job.id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Process start error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      rankedProfiles: job.rankings.map(ranking => ({
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
      })),
      topMatches: job.rankings.slice(0, 3).map(ranking => ({
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
      })),
      timestamp: job.processing_completed_at
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;