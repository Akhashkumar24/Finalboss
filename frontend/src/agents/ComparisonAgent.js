import GeminiService from '../services/GeminiService';

class ComparisonAgent {
  constructor(agentManager) {
    this.agentManager = agentManager;
    this.status = 'idle';
    this.queue = [];
    this.startTime = null;
  }

  async processComparison(jobDescription, consultantProfiles) {
    this.status = 'processing';
    this.startTime = Date.now();
    
    this.agentManager.updateAgentStats('comparisonAgent', {
      status: 'processing',
      queue: consultantProfiles.length
    });

    const results = [];
    
    try {
      for (let i = 0; i < consultantProfiles.length; i++) {
        const profile = consultantProfiles[i];
        
        // Update queue status
        this.agentManager.updateAgentStats('comparisonAgent', {
          queue: consultantProfiles.length - i - 1
        });

        const comparisonResult = await GeminiService.compareDocuments(
          jobDescription, 
          profile
        );

        const result = {
          profileId: profile.id,
          profile: profile,
          similarityScore: comparisonResult.overallScore,
          skillsMatch: comparisonResult.skillsMatch,
          experienceScore: comparisonResult.experienceScore,
          contextualRelevance: comparisonResult.contextualRelevance,
          explanation: comparisonResult.explanation,
          strengths: comparisonResult.strengths,
          gaps: comparisonResult.gaps,
          reasoning: comparisonResult.reasoning,
          timestamp: new Date()
        };

        results.push(result);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const latency = Date.now() - this.startTime;
      this.status = 'completed';
      
      this.agentManager.updateAgentStats('comparisonAgent', {
        status: 'completed',
        queue: 0,
        latency: latency
      });

      // Send results to Ranking Agent
      await this.agentManager.sendToRankingAgent(results);
      
      return results;
    } catch (error) {
      this.status = 'error';
      this.agentManager.updateAgentStats('comparisonAgent', {
        status: 'error',
        errors: 1
      });
      
      this.agentManager.addNotification({
        type: 'error',
        message: `Comparison Agent Error: ${error.message}`,
        agent: 'comparisonAgent'
      });
      
      throw error;
    }
  }

  getStatus() {
    return {
      status: this.status,
      queue: this.queue.length,
      startTime: this.startTime
    };
  }
}

export default ComparisonAgent;