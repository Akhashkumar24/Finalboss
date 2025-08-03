import BackendService from '../services/BackendService';

class AgentManager {
  constructor(dispatch) {
    this.dispatch = dispatch;
    this.currentWorkflow = null;
  }

  async startWorkflow(jobDescription, files, arRequestorEmail) {
    this.currentWorkflow = {
      id: `workflow_${Date.now()}`,
      startTime: new Date(),
      jobDescription,
      files,
      arRequestorEmail,
      status: 'running'
    };

    this.dispatch({ type: 'SET_PROCESSING', payload: true });
    
    try {
      this.addNotification({
        type: 'info',
        message: 'Uploading files and starting backend processing...',
        agent: 'system'
      });

      // Upload files and get job ID
      const uploadResult = await BackendService.uploadFilesAndStartProcessing(
        jobDescription,
        files,
        arRequestorEmail
      );

      this.currentWorkflow.jobId = uploadResult.jobId;
      
      this.addNotification({
        type: 'success',
        message: `Files uploaded successfully. Job ID: ${uploadResult.jobId}`,
        agent: 'uploadService'
      });

      // Start backend processing
      await BackendService.startJobProcessing(uploadResult.jobId);
      
      this.addNotification({
        type: 'info',
        message: 'Backend processing started. Monitoring progress...',
        agent: 'backendService'
      });

      // Poll for results
      const results = await BackendService.pollForResults(
        uploadResult.jobId,
        (status) => {
          this.updateWorkflowStatus({
            jdCompared: status.workflowStatus?.comparison_completed || false,
            profilesRanked: status.workflowStatus?.ranking_completed || false,
            emailSent: status.workflowStatus?.email_sent || false
          });

          this.addNotification({
            type: 'info',
            message: `Processing status: ${status.status} (${status.processedResumes}/${status.totalResumes} resumes processed)`,
            agent: 'backendService'
          });
        }
      );

      // Set the results in state
      this.dispatch({ type: 'SET_MATCHING_RESULTS', payload: results });
      
      this.addNotification({
        type: 'success',
        message: `Processing completed! Found ${results.rankedProfiles.length} candidates.`,
        agent: 'backendService'
      });

      this.currentWorkflow.status = 'completed';
      this.dispatch({ type: 'SET_PROCESSING', payload: false });
      
      return this.currentWorkflow;
    } catch (error) {
      this.addNotification({
        type: 'error',
        message: `Workflow failed: ${error.message}`,
        agent: 'system'
      });
      
      this.dispatch({ type: 'SET_PROCESSING', payload: false });
      throw error;
    }
  }


  updateAgentStats(agentName, stats) {
    this.dispatch({
      type: 'UPDATE_AGENT_STATS',
      payload: { agent: agentName, stats }
    });
  }

  updateWorkflowStatus(status) {
    this.dispatch({
      type: 'UPDATE_WORKFLOW_STATUS',
      payload: status
    });
  }

  addNotification(notification) {
    this.dispatch({
      type: 'ADD_NOTIFICATION',
      payload: notification
    });
  }

  getAgentStats() {
    return {
      comparison: this.comparisonAgent.getStatus(),
      ranking: this.rankingAgent.getStatus(),
      communication: this.communicationAgent.getStatus()
    };
  }

  getCurrentWorkflow() {
    return this.currentWorkflow;
  }
}

export default AgentManager;