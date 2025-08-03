const BackendComparisonAgent = require('./BackendComparisonAgent');
const BackendRankingAgent = require('./BackendRankingAgent');
const BackendCommunicationAgent = require('./BackendCommunicationAgent');
const { ProcessingLog } = require('../config/database');

class AgentOrchestrator {
  constructor() {
    this.comparisonAgent = new BackendComparisonAgent();
    this.rankingAgent = new BackendRankingAgent();
    this.communicationAgent = new BackendCommunicationAgent();
  }

  async processJob(job) {
    console.log(`Starting job processing for job ${job.id}`);
    
    try {
      // Log start of processing
      await ProcessingLog.create({
        job_id: job.id,
        agent_name: 'comparison',
        status: 'started',
        message: 'Starting document comparison phase'
      });

      // Update job agent stats with better tracking
      await job.updateAgentStats('comparison_agent', { 
        status: 'processing', 
        processed: 0,
        total: job.resumes?.length || 0,
        startTime: new Date()
      });

      // Step 1: Comparison Agent - Process all resumes
      console.log('Step 1: Starting comparison agent...');
      const comparisonResults = await this.comparisonAgent.processResumes(job);
      
      await job.updateWorkflowStatus({ jd_compared: true });
      await job.updateAgentStats('comparison_agent', { 
        status: 'completed', 
        processed: comparisonResults.length,
        completedTime: new Date(),
        results: comparisonResults.map(r => ({
          resumeId: r.resumeId,
          score: r.analysis.overallScore,
          candidate: r.resume.candidate_name
        }))
      });

      await ProcessingLog.create({
        job_id: job.id,
        agent_name: 'comparison',
        status: 'completed',
        message: `Compared ${comparisonResults.length} resumes against job description`,
        data: { 
          processedCount: comparisonResults.length,
          avgScore: comparisonResults.reduce((sum, r) => sum + r.analysis.overallScore, 0) / comparisonResults.length
        }
      });

      // Step 2: Ranking Agent - Rank the results
      console.log('Step 2: Starting ranking agent...');
      
      await job.updateAgentStats('ranking_agent', { 
        status: 'processing', 
        processed: 0,
        total: comparisonResults.length,
        startTime: new Date()
      });

      await ProcessingLog.create({
        job_id: job.id,
        agent_name: 'ranking',
        status: 'started',
        message: 'Starting candidate ranking phase'
      });

      const rankingResults = await this.rankingAgent.rankCandidates(job, comparisonResults);
      
      await job.updateWorkflowStatus({ profiles_ranked: true });
      await job.updateAgentStats('ranking_agent', { 
        status: 'completed', 
        processed: rankingResults.length,
        completedTime: new Date(),
        topCandidate: rankingResults[0] ? {
          name: rankingResults[0].Resume?.candidate_name || 'Unknown',
          score: rankingResults[0].overall_score,
          rank: rankingResults[0].rank
        } : null
      });

      await ProcessingLog.create({
        job_id: job.id,
        agent_name: 'ranking',
        status: 'completed',
        message: `Ranked ${rankingResults.length} candidates`,
        data: { 
          topScore: rankingResults[0]?.overall_score || 0,
          rankings: rankingResults.slice(0, 3).map(r => ({
            rank: r.rank,
            score: r.overall_score,
            resumeId: r.resume_id
          }))
        }
      });

      // Step 3: Communication Agent - Send notifications
      console.log('Step 3: Starting communication agent...');
      
      await job.updateAgentStats('communication_agent', { 
        status: 'processing', 
        processed: 0,
        total: 1,
        startTime: new Date()
      });

      await ProcessingLog.create({
        job_id: job.id,
        agent_name: 'communication',
        status: 'started',
        message: 'Starting email notification phase'
      });

      let emailResult = { success: false, error: null, type: null, recipient: null };

      try {
        // Enhanced email sending with better error handling
        console.log(`Attempting to send email for job ${job.id}...`);
        
        emailResult = await Promise.race([
          this.communicationAgent.sendNotifications(job, rankingResults),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000)
          )
        ]);
        
        console.log('Email result:', emailResult);
        
        await ProcessingLog.create({
          job_id: job.id,
          agent_name: 'communication',
          status: 'completed',
          message: `Email notification sent to ${emailResult.recipient || job.requestor_email}`,
          data: { 
            emailSent: emailResult.success,
            emailType: emailResult.type,
            recipient: emailResult.recipient,
            candidatesCount: emailResult.candidatesCount || 0
          }
        });

        await job.updateAgentStats('communication_agent', { 
          status: 'completed', 
          processed: 1,
          completedTime: new Date(),
          emailResult: {
            sent: emailResult.success,
            type: emailResult.type,
            recipient: emailResult.recipient
          }
        });

        console.log(`Email sent successfully for job ${job.id}`);

      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        emailResult = { success: false, error: emailError.message, type: 'failed' };
        
        await ProcessingLog.create({
          job_id: job.id,
          agent_name: 'communication',
          status: 'failed',
          message: `Email sending failed: ${emailError.message}`,
          data: { 
            emailError: emailError.message,
            stack: emailError.stack
          }
        });

        await job.updateAgentStats('communication_agent', { 
          status: 'failed', 
          processed: 0,
          completedTime: new Date(),
          error: emailError.message
        });
      }

      await job.updateWorkflowStatus({ email_sent: emailResult.success });

      // Mark job as completed regardless of email status
      await job.update({
        status: 'completed',
        processing_completed_at: new Date(),
        top_matches_count: Math.min(3, rankingResults.length),
        final_stats: {
          totalProcessed: comparisonResults.length,
          topScore: rankingResults[0]?.overall_score || 0,
          emailSent: emailResult.success,
          processingTime: new Date() - job.processing_started_at
        }
      });

      console.log(`Job ${job.id} processing completed successfully (email status: ${emailResult.success})`);
      
      return {
        success: true,
        jobId: job.id,
        processedCandidates: comparisonResults.length,
        rankedCandidates: rankingResults.length,
        emailSent: emailResult.success,
        emailError: emailResult.error,
        emailType: emailResult.type,
        emailRecipient: emailResult.recipient,
        topCandidate: rankingResults[0] || null
      };

    } catch (error) {
      console.error(`Job ${job.id} processing failed:`, error);
      
      // Enhanced error logging
      try {
        await ProcessingLog.create({
          job_id: job.id,
          agent_name: 'comparison', // Using valid enum value
          status: 'failed',
          message: `Job processing failed: ${error.message}`,
          data: { 
            error: error.message,
            stack: error.stack,
            timestamp: new Date()
          }
        });
      } catch (logError) {
        console.error('Failed to log processing error:', logError);
      }

      // Update all agent stats to failed
      const failedStats = {
        status: 'failed',
        error: error.message,
        failedTime: new Date()
      };

      await job.updateAgentStats('comparison_agent', failedStats);
      await job.updateAgentStats('ranking_agent', failedStats);
      await job.updateAgentStats('communication_agent', failedStats);

      // Update job status
      await job.update({
        status: 'failed',
        error_message: error.message,
        processing_completed_at: new Date()
      });

      throw error;
    }
  }

  async getJobProgress(jobId) {
    try {
      const logs = await ProcessingLog.findAll({
        where: { job_id: jobId },
        order: [['created_at', 'ASC']]
      });

      return logs.map(log => ({
        agent: log.agent_name,
        status: log.status,
        message: log.message,
        timestamp: log.created_at,
        data: log.data
      }));
    } catch (error) {
      console.error('Error fetching job progress:', error);
      return [];
    }
  }

  async getDetailedJobStats(jobId) {
    try {
      const { JobDescription } = require('../config/database');
      const job = await JobDescription.findByPk(jobId, {
        include: ['resumes', 'rankings']
      });

      if (!job) {
        return null;
      }

      const logs = await this.getJobProgress(jobId);
      
      return {
        jobId: job.id,
        title: job.title,
        status: job.status,
        workflowStatus: job.workflow_status,
        agentStats: job.agent_stats,
        processingStarted: job.processing_started_at,
        processingCompleted: job.processing_completed_at,
        errorMessage: job.error_message,
        finalStats: job.final_stats,
        logs: logs,
        resumes: job.resumes?.map(r => ({
          id: r.id,
          name: r.candidate_name,
          email: r.candidate_email,
          status: r.processing_status
        })) || [],
        rankings: job.rankings?.map(r => ({
          rank: r.rank,
          score: r.overall_score,
          candidateName: r.Resume?.candidate_name || 'Unknown'
        })) || []
      };

    } catch (error) {
      console.error(`Error getting detailed job stats for ${jobId}:`, error);
      return null;
    }
  }

  async retryFailedJob(jobId) {
    try {
      const { JobDescription } = require('../config/database');
      const job = await JobDescription.findByPk(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status !== 'failed') {
        throw new Error(`Job ${jobId} is not in failed status`);
      }

      // Reset job status and clear previous stats
      await job.update({
        status: 'processing',
        error_message: null,
        processing_started_at: new Date(),
        processing_completed_at: null,
        agent_stats: {},
        workflow_status: {
          jd_compared: false,
          profiles_ranked: false,
          email_sent: false
        }
      });

      console.log(`Retrying failed job ${jobId}`);
      return await this.processJob(job);

    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      throw error;
    }
  }

  async getJobStats(jobId) {
    try {
      const { JobDescription } = require('../config/database');
      const job = await JobDescription.findByPk(jobId, {
        include: ['resumes', 'rankings']
      });

      if (!job) {
        return null;
      }

      return {
        jobId: job.id,
        title: job.title,
        status: job.status,
        totalResumes: job.total_resumes,
        processedResumes: job.processed_resumes,
        topMatchesCount: job.top_matches_count,
        workflowStatus: job.workflow_status,
        agentStats: job.agent_stats,
        processingStarted: job.processing_started_at,
        processingCompleted: job.processing_completed_at,
        errorMessage: job.error_message,
        resumeCount: job.resumes?.length || 0,
        rankingCount: job.rankings?.length || 0
      };

    } catch (error) {
      console.error(`Error getting job stats for ${jobId}:`, error);
      return null;
    }
  }
}

module.exports = AgentOrchestrator;