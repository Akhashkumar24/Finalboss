const { GoogleGenerativeAI } = require('@google/generative-ai');

class BackendComparisonAgent {
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

  async processResumes(job) {
    console.log(`Comparison Agent processing ${job.resumes.length} resumes for job ${job.id}`);
    
    const results = [];
    
    for (let i = 0; i < job.resumes.length; i++) {
      const resume = job.resumes[i];
      
      if (resume.processing_status !== 'completed') {
        console.log(`Skipping resume ${resume.id} - not successfully processed`);
        continue;
      }

      try {
        console.log(`Analyzing resume ${i + 1}/${job.resumes.length}: ${resume.candidate_name}`);
        
        const analysisResult = await this.retryWithBackoff(() => 
          this.compareResumeWithJD(job.content, resume)
        );
        
        // Store the analysis in the resume record
        await resume.setGeminiAnalysis(analysisResult);
        
        results.push({
          resumeId: resume.id,
          resume: resume,
          analysis: analysisResult
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error analyzing resume ${resume.candidate_name}:`, error);
        
        // Store error analysis
        const fallbackAnalysis = {
          overallScore: 50,
          skillsMatch: 40,
          experienceScore: 50,
          contextualRelevance: 45,
          explanation: "Analysis failed - using fallback scoring",
          strengths: ["Technical background"],
          gaps: ["Analysis incomplete"],
          reasoning: `Analysis failed: ${error.message}`
        };
        
        await resume.setGeminiAnalysis(fallbackAnalysis);
        
        results.push({
          resumeId: resume.id,
          resume: resume,
          analysis: fallbackAnalysis
        });
      }
    }
    
    console.log(`Comparison Agent completed: ${results.length} resumes analyzed`);
    return results;
  }

  async compareResumeWithJD(jobDescription, resume) {
    const prompt = `
      As an AI recruitment expert, compare this job description with the candidate's resume and provide detailed analysis:

      JOB DESCRIPTION:
      ${jobDescription}

      CANDIDATE RESUME:
      Name: ${resume.candidate_name}
      Email: ${resume.candidate_email || 'Not provided'}
      Skills: ${Array.isArray(resume.skills) ? resume.skills.join(', ') : 'Not specified'}
      Experience: ${resume.experience_years || 'Not specified'}
      Domain: ${resume.domain || 'Not specified'}
      
      Full Resume Content:
      ${resume.extracted_text || 'Content not available'}

      Please analyze and provide scores (0-100) for:
      1. Overall similarity score
      2. Skills match percentage  
      3. Experience relevance score
      4. Contextual relevance analysis
      5. Detailed explanation for the scoring
      6. Key strengths that match the job
      7. Gaps or missing requirements

      Return your response in JSON format:
      {
        "overallScore": number,
        "skillsMatch": number,
        "experienceScore": number,
        "contextualRelevance": number,
        "explanation": "detailed explanation of the analysis",
        "strengths": ["strength1", "strength2", "strength3"],
        "gaps": ["gap1", "gap2"],
        "reasoning": "specific reasoning why this candidate received this score"
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Validate and clean the analysis
        return {
          overallScore: Math.max(0, Math.min(100, analysis.overallScore || 50)),
          skillsMatch: Math.max(0, Math.min(100, analysis.skillsMatch || 40)),
          experienceScore: Math.max(0, Math.min(100, analysis.experienceScore || 50)),
          contextualRelevance: Math.max(0, Math.min(100, analysis.contextualRelevance || 45)),
          explanation: analysis.explanation || "Analysis completed",
          strengths: Array.isArray(analysis.strengths) ? analysis.strengths : ["Technical background"],
          gaps: Array.isArray(analysis.gaps) ? analysis.gaps : ["Some gaps identified"],
          reasoning: analysis.reasoning || "Standard analysis completed"
        };
      }
      
      throw new Error('Could not parse JSON response from Gemini');
      
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

module.exports = BackendComparisonAgent;