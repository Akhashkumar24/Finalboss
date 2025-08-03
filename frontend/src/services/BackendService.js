class BackendService {
  constructor() {
    this.baseURL = 'http://localhost:5001/api';
  }

  async uploadFilesAndStartProcessing(jobDescription, files, arRequestorEmail) {
    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    formData.append('requestorEmail', arRequestorEmail);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('resumes', files[i]);
    }

    const response = await fetch(`${this.baseURL}/upload/resumes`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getJobStatus(jobId) {
    const response = await fetch(`${this.baseURL}/jobs/${jobId}/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return await response.json();
  }

  async getJobResults(jobId) {
    const response = await fetch(`${this.baseURL}/jobs/${jobId}/results`);
    
    if (!response.ok) {
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.error || 'Job not completed yet');
      }
      throw new Error(`Failed to get results: ${response.statusText}`);
    }

    return await response.json();
  }

  async startJobProcessing(jobId) {
    const response = await fetch(`${this.baseURL}/jobs/${jobId}/process`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to start processing: ${response.statusText}`);
    }

    return await response.json();
  }

  // Poll for job completion
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
              reject(error);
            }
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error('Job processing failed'));
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error(`Polling timeout after ${Math.round((maxAttempts * intervalMs) / 60000)} minutes. The job may still be processing in the background. Please check back later or contact support.`));
          }
        } catch (error) {
          console.warn(`Polling error on attempt ${attempts}: ${error.message}`);
          
          // If it's a rate limit error, wait longer before next attempt
          if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            console.log('Rate limit hit, extending wait time for next poll...');
            // Don't count this as a failed attempt, just continue
            return;
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(error);
          }
          // Continue polling on error unless max attempts reached
        }
      }, intervalMs);
    });
  }
}

export default new BackendService();