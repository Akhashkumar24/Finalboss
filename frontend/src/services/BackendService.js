// Complete frontend/src/services/BackendService.js

class BackendService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    this.timeout = 10000; // 10 seconds timeout
  }

  // Helper method for fetch with timeout and error handling
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      throw error;
    }
  }

  // =======================
  // ORIGINAL METHODS
  // =======================

  async uploadFilesAndStartProcessing(jobDescription, files, arRequestorEmail) {
    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    formData.append('requestorEmail', arRequestorEmail);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('resumes', files[i]);
    }

    try {
      const response = await fetch(`${this.baseURL}/upload/resumes`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async getJobStatus(jobId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/jobs/${jobId}/status`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching job status:', error);
      throw new Error(`Failed to get job status: ${error.message}`);
    }
  }

  async getJobResults(jobId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/jobs/${jobId}/results`);
      return await response.json();
    } catch (error) {
      if (error.message.includes('400')) {
        throw new Error('Job not completed yet');
      }
      console.error('Error fetching job results:', error);
      throw new Error(`Failed to get job results: ${error.message}`);
    }
  }

  async startJobProcessing(jobId) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/jobs/${jobId}/process`, {
        method: 'POST',
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting job processing:', error);
      throw new Error(`Failed to start processing: ${error.message}`);
    }
  }

  // Poll for job completion with enhanced error handling
  async pollForResults(jobId, onStatusUpdate, maxAttempts = 120, intervalMs = 5000) {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          
          const status = await this.getJobStatus(jobId);
          
          console.log(`Polling attempt ${attempts}/${maxAttempts}: Job ${jobId} status: ${status.status}`);
          
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            try {
              const results = await this.getJobResults(jobId);
              resolve(results);
            } catch (error) {
              reject(new Error(`Failed to get results: ${error.message}`));
            }
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(`Job processing failed: ${status.error_message || 'Unknown error'}`));
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error(`Polling timeout after ${Math.round((maxAttempts * intervalMs) / 60000)} minutes. The job may still be processing in the background.`));
          }
        } catch (error) {
          console.warn(`Polling error on attempt ${attempts}: ${error.message}`);
          
          // If it's a rate limit error, continue polling
          if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            console.log('Rate limit hit, continuing to poll...');
            return;
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error(`Polling failed after ${attempts} attempts: ${error.message}`));
          }
        }
      }, intervalMs);
    });
  }

  // =======================
  // NEW REAL-TIME METHODS
  // =======================

  // Get real-time agent statistics from database
  async getRealTimeAgentStats() {
    try {
      console.log('🔄 Fetching real-time agent stats...');
      const response = await this.fetchWithTimeout(`${this.baseURL}/agents/realtime-stats`);
      const data = await response.json();
      
      console.log('✅ Real-time agent stats fetched successfully');
      
      // Transform the data for frontend consumption
      return {
        comparisonAgent: {
          ...data.agentStats.comparisonAgent,
          name: 'Document Comparison Agent'
        },
        rankingAgent: {
          ...data.agentStats.rankingAgent,
          name: 'Candidate Ranking Agent'
        },
        communicationAgent: {
          ...data.agentStats.communicationAgent,
          name: 'Email Communication Agent'
        },
        systemStats: data.systemStats,
        recentActivity: data.recentActivity,
        databaseTables: data.databaseTables,
        timestamp: data.timestamp
      };

    } catch (error) {
      console.error('❌ Error fetching real-time agent stats:', error);
      throw new Error(`Real-time stats unavailable: ${error.message}`);
    }
  }

  // System health check
  async getSystemHealth() {
    try {
      console.log('🔄 Checking system health...');
      const response = await this.fetchWithTimeout(`${this.baseURL}/agents/system-health`);
      const data = await response.json();
      
      console.log('✅ System health check completed');
      return data;
    } catch (error) {
      console.error('❌ System health check failed:', error);
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  // Get recent activity logs
  async getActivityLogs(limit = 50, hours = 24) {
    try {
      console.log(`🔄 Fetching activity logs (${limit} entries, ${hours}h)...`);
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/agents/activity-logs?limit=${limit}&hours=${hours}`
      );
      const data = await response.json();
      
      console.log(`✅ Activity logs fetched: ${data.logs.length} entries`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching activity logs:', error);
      throw new Error(`Activity logs unavailable: ${error.message}`);
    }
  }

  // Get all jobs with detailed stats (for recruiter dashboard)
  async getAllJobsWithStats() {
    try {
      console.log('🔄 Fetching all jobs with stats...');
      const response = await this.fetchWithTimeout(`${this.baseURL}/jobs`);
      const jobs = await response.json();
      
      console.log(`✅ Jobs fetched: ${jobs.length} jobs`);
      
      // Transform jobs data for frontend
      return jobs.map(job => ({
        id: job.id,
        title: job.title,
        content: job.content,
        status: job.status,
        requestorEmail: job.requestor_email,
        totalResumes: job.total_resumes || 0,
        processedResumes: job.processed_resumes || 0,
        workflowStatus: job.workflow_status || {},
        agentStats: job.agent_stats || {},
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        processingStartedAt: job.processing_started_at,
        processingCompletedAt: job.processing_completed_at,
        errorMessage: job.error_message,
        topMatchesCount: job.top_matches_count || 0,
        
        // Calculated fields
        successRate: job.total_resumes > 0 ? 
          Math.round((job.processed_resumes / job.total_resumes) * 100) : 0,
        processingTime: job.processing_started_at && job.processing_completed_at ?
          new Date(job.processing_completed_at) - new Date(job.processing_started_at) : null,
        isRecent: new Date(job.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      }));

    } catch (error) {
      console.error('❌ Error fetching jobs with stats:', error);
      throw new Error(`Jobs data unavailable: ${error.message}`);
    }
  }

  // Enhanced job status with real-time updates and logs
  async getEnhancedJobStatus(jobId) {
    try {
      console.log(`🔄 Fetching enhanced status for job ${jobId}...`);
      
      const [jobStatus, activityLogs] = await Promise.allSettled([
        this.getJobStatus(jobId),
        this.getActivityLogs(20, 1) // Last 1 hour, 20 entries
      ]);

      const status = jobStatus.status === 'fulfilled' ? jobStatus.value : null;
      const logs = activityLogs.status === 'fulfilled' ? activityLogs.value.logs : [];

      if (!status) {
        throw new Error('Failed to fetch job status');
      }

      // Filter logs for this specific job
      const jobLogs = logs.filter(log => log.jobId === jobId) || [];

      console.log(`✅ Enhanced status fetched for job ${jobId}`);
      
      return {
        ...status,
        recentLogs: jobLogs,
        lastActivity: jobLogs.length > 0 ? jobLogs[0].timestamp : null,
        logCount: jobLogs.length
      };

    } catch (error) {
      console.error(`❌ Error fetching enhanced job status for ${jobId}:`, error);
      throw new Error(`Enhanced status unavailable: ${error.message}`);
    }
  }

  // Test backend connectivity
  async testConnection() {
    try {
      console.log('🔄 Testing backend connection...');
      const response = await this.fetchWithTimeout(`${this.baseURL.replace('/api', '')}/health`);
      const data = await response.json();
      
      console.log('✅ Backend connection test passed');
      return {
        connected: true,
        status: data.status,
        uptime: data.uptime,
        environment: data.environment,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      return {
        connected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Get API endpoints info
  async getApiInfo() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching API info:', error);
      throw new Error(`API info unavailable: ${error.message}`);
    }
  }

  // =======================
  // UTILITY METHODS
  // =======================

  // Format time duration
  formatDuration(milliseconds) {
    if (!milliseconds) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get base URL for debugging
  getBaseURL() {
    return this.baseURL;
  }

  // Set timeout for requests
  setTimeout(timeout) {
    this.timeout = timeout;
  }
}

export default new BackendService();
