import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    this.apiKey = 'AIzaSyAMdNQvOcQiXYbjZZkBHdTXR-wYylclG1g';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    // Try the most commonly available model first
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  async compareDocuments(jobDescription, consultantProfile) {
    try {
      const prompt = `
        As an AI recruitment expert, compare the following job description with the consultant profile and provide a detailed analysis:

        JOB DESCRIPTION:
        ${jobDescription}

        CONSULTANT PROFILE:
        Name: ${consultantProfile.name}
        Skills: ${consultantProfile.skills.join(', ')}
        Experience: ${consultantProfile.experience}
        Domain: ${consultantProfile.domain}
        Content: ${consultantProfile.content}

        Please provide:
        1. Overall similarity score (0-100)
        2. Skills match percentage
        3. Experience relevance score (0-100)
        4. Contextual relevance analysis
        5. Detailed explanation for the scoring
        6. Strengths and gaps

        Return your response in the following JSON format:
        {
          "overallScore": number,
          "skillsMatch": number,
          "experienceScore": number,
          "contextualRelevance": number,
          "explanation": "detailed explanation",
          "strengths": ["strength1", "strength2"],
          "gaps": ["gap1", "gap2"],
          "reasoning": "why this score was given"
        }
      `;

      const apiCall = async () => {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      };

      const text = await this.retryWithBackoff(apiCall);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if JSON parsing fails
      return {
        overallScore: 70,
        skillsMatch: 65,
        experienceScore: 75,
        contextualRelevance: 70,
        explanation: "Analysis completed with fallback scoring",
        strengths: ["Good technical background"],
        gaps: ["Some skill gaps identified"],
        reasoning: "Automated analysis with standard scoring"
      };
    } catch (error) {
      console.error('Error in document comparison:', error);
      throw error;
    }
  }

  async generateMatchingExplanation(jobDescription, rankedProfiles) {
    try {
      const prompt = `
        Provide a comprehensive explanation for why these consultant profiles were ranked in this order for the given job description:

        JOB DESCRIPTION:
        ${jobDescription}

        RANKED PROFILES:
        ${rankedProfiles.map((profile, index) => `
          ${index + 1}. ${profile.name} (Score: ${profile.matchScore})
          Skills: ${profile.skills.join(', ')}
          Experience: ${profile.experience}
        `).join('\n')}

        Explain:
        1. Why the top candidate is ranked first
        2. Key differentiating factors between candidates
        3. How each candidate's skills align with job requirements
        4. Experience level considerations
        5. Overall recommendation rationale

        Keep the explanation clear and actionable for recruiters.
      `;

      const apiCall = async () => {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      };

      return await this.retryWithBackoff(apiCall);
    } catch (error) {
      console.error('Error generating explanation:', error);
      return 'Ranking based on skills match, experience relevance, and contextual fit with the job requirements.';
    }
  }

  async extractJDRequirements(jobDescription) {
    try {
      const prompt = `
        Extract key requirements from this job description:

        ${jobDescription}

        Return a JSON object with:
        {
          "requiredSkills": ["skill1", "skill2"],
          "preferredSkills": ["skill1", "skill2"],
          "experienceLevel": "junior/mid/senior",
          "domain": "domain name",
          "keyResponsibilities": ["responsibility1", "responsibility2"]
        }
      `;

      const apiCall = async () => {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      };

      const text = await this.retryWithBackoff(apiCall);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        requiredSkills: ['Technical Skills'],
        preferredSkills: ['Additional Skills'],
        experienceLevel: 'mid',
        domain: 'Technology',
        keyResponsibilities: ['Development', 'Collaboration']
      };
    } catch (error) {
      console.error('Error extracting JD requirements:', error);
      throw error;
    }
  }
}

export default new GeminiService();