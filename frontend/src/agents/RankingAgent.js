import GeminiService from '../services/GeminiService';

class RankingAgent {
  constructor(agentManager) {
    this.agentManager = agentManager;
    this.status = 'idle';
    this.startTime = null;
  }

  async processRanking(comparisonResults, jobDescription) {
    this.status = 'processing';
    this.startTime = Date.now();
    
    this.agentManager.updateAgentStats('rankingAgent', {
      status: 'processing',
      queue: comparisonResults.length
    });

    try {
      // Calculate composite scores with weights
      const rankedProfiles = comparisonResults.map(result => ({
        ...result,
        compositeScore: this.calculateCompositeScore(result),
        matchScore: result.similarityScore // Keep original for display
      }));

      // Sort by composite score
      rankedProfiles.sort((a, b) => b.compositeScore - a.compositeScore);

      // Add ranking explanations
      for (let i = 0; i < rankedProfiles.length; i++) {
        rankedProfiles[i].rank = i + 1;
        rankedProfiles[i].rankingExplanation = this.generateRankingExplanation(
          rankedProfiles[i], 
          i + 1,
          rankedProfiles.length
        );
      }

      // Generate overall ranking explanation using Gemini
      const overallExplanation = await GeminiService.generateMatchingExplanation(
        jobDescription,
        rankedProfiles.slice(0, 3) // Top 3 for explanation
      );

      const finalResults = {
        rankedProfiles,
        overallExplanation,
        totalCandidates: rankedProfiles.length,
        topMatches: rankedProfiles.slice(0, 3),
        timestamp: new Date()
      };

      const latency = Date.now() - this.startTime;
      this.status = 'completed';
      
      this.agentManager.updateAgentStats('rankingAgent', {
        status: 'completed',
        queue: 0,
        latency: latency
      });

      // Send to Communication Agent
      await this.agentManager.sendToCommunicationAgent(finalResults);
      
      return finalResults;
    } catch (error) {
      this.status = 'error';
      this.agentManager.updateAgentStats('rankingAgent', {
        status: 'error',
        errors: 1
      });
      
      this.agentManager.addNotification({
        type: 'error',
        message: `Ranking Agent Error: ${error.message}`,
        agent: 'rankingAgent'
      });
      
      throw error;
    }
  }

  calculateCompositeScore(result) {
    // Weighted scoring algorithm
    const weights = {
      similarityScore: 0.4,
      skillsMatch: 0.3,
      experienceScore: 0.2,
      contextualRelevance: 0.1
    };

    return (
      result.similarityScore * weights.similarityScore +
      result.skillsMatch * weights.skillsMatch +
      result.experienceScore * weights.experienceScore +
      result.contextualRelevance * weights.contextualRelevance
    );
  }

  generateRankingExplanation(candidate, rank, totalCandidates) {
    const score = candidate.compositeScore;
    const profile = candidate.profile;
    
    let explanation = `Ranked #${rank} out of ${totalCandidates} candidates. `;
    
    if (rank === 1) {
      explanation += `${profile.name} is the top match with a composite score of ${score.toFixed(1)}. `;
    } else if (rank <= 3) {
      explanation += `${profile.name} is among the top candidates with a score of ${score.toFixed(1)}. `;
    } else {
      explanation += `${profile.name} scored ${score.toFixed(1)} and may need additional evaluation. `;
    }

    // Add specific strengths
    if (candidate.strengths && candidate.strengths.length > 0) {
      explanation += `Key strengths: ${candidate.strengths.join(', ')}. `;
    }

    // Add skills match info
    explanation += `Skills match: ${candidate.skillsMatch}%, Experience relevance: ${candidate.experienceScore}%. `;

    // Add reasoning
    if (candidate.reasoning) {
      explanation += candidate.reasoning;
    }

    return explanation;
  }

  getStatus() {
    return {
      status: this.status,
      startTime: this.startTime
    };
  }
}

export default RankingAgent;