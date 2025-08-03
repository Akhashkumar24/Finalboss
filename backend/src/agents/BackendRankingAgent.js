const { RankingResult } = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class BackendRankingAgent {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  async retryWithBackoff(fn, retries = this.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && (error.message.includes('503') || error.message.includes('overloaded') || error.message.includes('Service Unavailable'))) {
        const delay = this.baseDelay * Math.pow(2, this.maxRetries - retries);
        console.log(`Retrying in ${delay}ms due to service overload. Retries left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, retries - 1);
      }
      throw error;
    }
  }

  async rankCandidates(job, comparisonResults) {
    console.log(`Ranking Agent processing ${comparisonResults.length} candidates for job ${job.id}`);
    
    // Calculate composite scores and rank
    const rankedCandidates = comparisonResults.map(result => {
      const analysis = result.analysis;
      const compositeScore = this.calculateCompositeScore(analysis);
      
      return {
        ...result,
        compositeScore,
        finalScore: analysis.overallScore // Use overall score for display
      };
    });

    // Sort by composite score (highest first)
    rankedCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    // Generate enhanced explanations using Gemini
    const enhancedRankings = await this.generateRankingExplanations(job, rankedCandidates);

    // Save ranking results to database
    const savedRankings = [];
    
    for (let i = 0; i < enhancedRankings.length; i++) {
      const candidate = enhancedRankings[i];
      const analysis = candidate.analysis;
      
      try {
        const rankingResult = await RankingResult.create({
          job_id: job.id,
          resume_id: candidate.resumeId,
          rank: i + 1,
          overall_score: analysis.overallScore,
          skills_match: analysis.skillsMatch,
          experience_score: analysis.experienceScore,
          contextual_relevance: analysis.contextualRelevance,
          explanation: candidate.enhancedExplanation || analysis.explanation,
          strengths: analysis.strengths,
          gaps: analysis.gaps
        });

        savedRankings.push(rankingResult);
        
      } catch (error) {
        console.error(`Error saving ranking for candidate ${candidate.resume.candidate_name}:`, error);
      }
    }

    console.log(`Ranking Agent completed: ${savedRankings.length} candidates ranked`);
    return savedRankings;
  }

  calculateCompositeScore(analysis) {
    // Weighted scoring algorithm
    const weights = {
      overallScore: 0.4,
      skillsMatch: 0.3,
      experienceScore: 0.2,
      contextualRelevance: 0.1
    };

    return (
      (analysis.overallScore || 0) * weights.overallScore +
      (analysis.skillsMatch || 0) * weights.skillsMatch +
      (analysis.experienceScore || 0) * weights.experienceScore +
      (analysis.contextualRelevance || 0) * weights.contextualRelevance
    );
  }

  async generateRankingExplanations(job, rankedCandidates) {
    // Generate explanations for top 5 candidates
    const topCandidates = rankedCandidates.slice(0, Math.min(5, rankedCandidates.length));
    
    try {
      const prompt = `
        As an AI recruitment expert, provide detailed ranking explanations for these candidates for the following job:

        JOB DESCRIPTION:
        ${job.content}

        RANKED CANDIDATES (in order):
        ${topCandidates.map((candidate, index) => `
          ${index + 1}. ${candidate.resume.candidate_name}
             Overall Score: ${candidate.analysis.overallScore}%
             Skills Match: ${candidate.analysis.skillsMatch}%
             Experience: ${candidate.analysis.experienceScore}%
             Skills: ${Array.isArray(candidate.resume.skills) ? candidate.resume.skills.join(', ') : 'Not specified'}
             Experience: ${candidate.resume.experience_years || 'Not specified'}
        `).join('\n')}

        For each candidate, provide:
        1. Why they are ranked at this position
        2. Key differentiators from other candidates
        3. Specific strengths for this role
        4. How they compare to job requirements
        5. Recommendation for next steps

        Return as JSON array:
        [
          {
            "rank": 1,
            "explanation": "detailed explanation for rank 1 candidate",
            "keyDifferentiators": ["differentiator1", "differentiator2"],
            "recommendation": "recommendation text"
          },
          ...
        ]
      `;

      const apiCall = async () => {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      };

      const text = await this.retryWithBackoff(apiCall);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const explanations = JSON.parse(jsonMatch[0]);
        
        // Merge explanations with candidates
        return topCandidates.map((candidate, index) => {
          const explanation = explanations[index] || {};
          return {
            ...candidate,
            enhancedExplanation: explanation.explanation || candidate.analysis.explanation,
            keyDifferentiators: explanation.keyDifferentiators || [],
            recommendation: explanation.recommendation || "Review candidate profile and consider for interview"
          };
        });
      }
    } catch (error) {
      console.error('Error generating ranking explanations:', error);
    }

    // Fallback: return candidates with basic explanations
    return topCandidates.map((candidate, index) => ({
      ...candidate,
      enhancedExplanation: `Ranked #${index + 1} with ${candidate.analysis.overallScore}% overall match. ${candidate.analysis.reasoning}`,
      keyDifferentiators: candidate.analysis.strengths || [],
      recommendation: index < 3 ? "Strong candidate - recommend for interview" : "Consider for future opportunities"
    }));
  }

  generateBasicExplanation(candidate, rank, totalCandidates) {
    const analysis = candidate.analysis;
    const resume = candidate.resume;
    
    let explanation = `Ranked #${rank} out of ${totalCandidates} candidates. `;
    
    if (rank === 1) {
      explanation += `${resume.candidate_name} is the top match with ${analysis.overallScore}% overall compatibility. `;
    } else if (rank <= 3) {
      explanation += `${resume.candidate_name} is among the top candidates with ${analysis.overallScore}% compatibility. `;
    } else {
      explanation += `${resume.candidate_name} scored ${analysis.overallScore}% and may need additional evaluation. `;
    }

    // Add specific strengths
    if (analysis.strengths && analysis.strengths.length > 0) {
      explanation += `Key strengths: ${analysis.strengths.join(', ')}. `;
    }

    // Add skills match info
    explanation += `Skills alignment: ${analysis.skillsMatch}%, Experience relevance: ${analysis.experienceScore}%. `;

    // Add reasoning
    if (analysis.reasoning) {
      explanation += analysis.reasoning;
    }

    return explanation;
  }
}

module.exports = BackendRankingAgent;