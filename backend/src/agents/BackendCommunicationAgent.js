const emailService = require('../services/emailService');
const { EmailNotification } = require('../config/database');

class BackendCommunicationAgent {
  async sendNotifications(job, rankingResults) {
    console.log(`Communication Agent sending notifications for job ${job.id}`);
    console.log(`Found ${rankingResults.length} ranking results`);
    
    try {
      // Validate input
      if (!rankingResults || rankingResults.length === 0) {
        throw new Error('No ranking results provided for email notification');
      }

      // Get top matches with associated resume data
      const topMatches = await this.getTopMatchesWithResumes(rankingResults.slice(0, 3));
      console.log(`Top matches prepared: ${topMatches.length}`);
      
      // Always send results to AR requestor who submitted the job
      console.log('Sending results to AR requestor');
      return await this.sendTopMatchesNotification(job, topMatches, rankingResults);
      
    } catch (error) {
      console.error('Communication Agent error:', error);
      throw error;
    }
  }

  async getTopMatchesWithResumes(rankings) {
    const topMatches = [];
    
    for (const ranking of rankings) {
      try {
        // Get the associated resume
        const resume = await ranking.getResume();
        
        if (resume) {
          topMatches.push({
            ...ranking.toJSON(),
            Resume: resume.toJSON()
          });
        } else {
          console.warn(`No resume found for ranking ${ranking.id}`);
        }
      } catch (error) {
        console.error(`Error getting resume for ranking ${ranking.id}:`, error);
      }
    }
    
    return topMatches;
  }

  async sendTopMatchesNotification(job, topMatches, allRankings) {
    const topCandidates = await this.formatTopCandidates(topMatches);
    const overallAnalysis = this.generateOverallAnalysis(job, allRankings);
    
    // Validate email service and requestor email
    if (!job.requestor_email) {
      throw new Error('No requestor email found for job');
    }

    console.log(`Preparing to send results email to AR requestor: ${job.requestor_email}`);
    
    try {
      // Check if email service is available
      if (!emailService || typeof emailService.sendTopMatchesEmail !== 'function') {
        throw new Error('Email service not properly configured');
      }

      // Send email using email service
      const emailResult = await emailService.sendTopMatchesEmail(
        job.requestor_email,
        job.title,
        topCandidates,
        overallAnalysis
      );

      console.log('Email service response:', emailResult);

      // Log successful email notification
      await EmailNotification.create({
        job_id: job.id,
        recipient_email: job.requestor_email,
        subject: `Candidate Analysis Results - ${job.title}`,
        content: JSON.stringify({
          type: 'top_matches',
          candidatesCount: topCandidates.length,
          topScore: topCandidates[0]?.score || 0
        }),
        sent_at: new Date(),
        status: 'sent'
      });

      console.log(`Results email sent successfully to AR requestor: ${job.requestor_email}`);
      
      return {
        success: true,
        type: 'top_matches',
        recipient: job.requestor_email,
        candidatesCount: topCandidates.length,
        messageId: emailResult.messageId || `msg_${Date.now()}`
      };

    } catch (error) {
      console.error('Email sending error:', error);
      
      // Log failed email notification
      await EmailNotification.create({
        job_id: job.id,
        recipient_email: job.requestor_email,
        subject: `Candidate Analysis Results - ${job.title}`,
        content: JSON.stringify({
          type: 'top_matches',
          error: error.message,
          candidatesCount: topCandidates.length
        }),
        status: 'failed'
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendNoMatchesNotification(job, rankingResults) {
    const recruiterEmail = process.env.RECRUITER_EMAIL || 'recruiter@techtitans.com';
    const partialMatches = rankingResults.slice(0, Math.min(3, rankingResults.length));
    
    console.log(`Preparing no matches email for recruiter: ${recruiterEmail}`);
    
    try {
      // Format partial matches
      const formattedMatches = await this.formatPartialMatches(partialMatches);
      
      // Check if email service is available
      if (!emailService || typeof emailService.sendNoMatchesEmail !== 'function') {
        throw new Error('Email service not properly configured for no matches email');
      }

      // Send email to recruiter
      const emailResult = await emailService.sendNoMatchesEmail(
        recruiterEmail,
        job.title,
        rankingResults.length,
        formattedMatches
      );

      console.log('No matches email service response:', emailResult);

      // Log email notification
      await EmailNotification.create({
        job_id: job.id,
        recipient_email: recruiterEmail,
        subject: `No Suitable Matches Found - ${job.title}`,
        content: JSON.stringify({
          type: 'no_matches',
          candidatesAnalyzed: rankingResults.length,
          partialMatches: formattedMatches.length
        }),
        sent_at: new Date(),
        status: 'sent'
      });

      console.log(`No matches email sent successfully to recruiter: ${recruiterEmail}`);
      
      return {
        success: true,
        type: 'no_matches',
        recipient: recruiterEmail,
        candidatesAnalyzed: rankingResults.length,
        messageId: emailResult.messageId || `msg_${Date.now()}`
      };

    } catch (error) {
      console.error('No matches email sending error:', error);
      
      // Log failed email notification
      await EmailNotification.create({
        job_id: job.id,
        recipient_email: recruiterEmail,
        subject: `No Suitable Matches Found - ${job.title}`,
        content: JSON.stringify({
          type: 'no_matches',
          error: error.message,
          candidatesAnalyzed: rankingResults.length
        }),
        status: 'failed'
      });

      throw new Error(`Failed to send no matches email: ${error.message}`);
    }
  }

  async formatTopCandidates(topMatches) {
    const formattedCandidates = [];
    
    for (const ranking of topMatches) {
      try {
        const resume = ranking.Resume;
        
        if (!resume) {
          console.warn('No resume data found for ranking');
          continue;
        }
        
        const candidate = {
          candidateName: resume.candidate_name || 'Unknown Candidate',
          email: resume.candidate_email || 'Not provided',
          skills: Array.isArray(resume.skills) ? resume.skills : [],
          experience: resume.experience_years || 'Not specified',
          domain: resume.domain || 'Technology',
          score: Math.round(ranking.overall_score || 0),
          skillsMatch: Math.round(ranking.skills_match || 0),
          experienceScore: Math.round(ranking.experience_score || 0),
          contextualRelevance: Math.round(ranking.contextual_relevance || 0),
          explanation: ranking.explanation || 'Analysis completed',
          strengths: Array.isArray(ranking.strengths) ? ranking.strengths : [],
          gaps: Array.isArray(ranking.gaps) ? ranking.gaps : [],
          reasoning: `Ranked #${ranking.rank} based on comprehensive AI analysis`
        };
        
        formattedCandidates.push(candidate);
      } catch (error) {
        console.error('Error formatting candidate:', error);
        // Add a fallback candidate to avoid breaking the email
        formattedCandidates.push({
          candidateName: 'Data Processing Error',
          email: 'Not available',
          skills: [],
          experience: 'Not specified',
          domain: 'Technology',
          score: 0,
          skillsMatch: 0,
          experienceScore: 0,
          contextualRelevance: 0,
          explanation: 'Error processing candidate data',
          strengths: [],
          gaps: ['Data processing error'],
          reasoning: 'Unable to process candidate information'
        });
      }
    }
    
    console.log(`Formatted ${formattedCandidates.length} candidates for email`);
    return formattedCandidates;
  }

  async formatPartialMatches(partialMatches) {
    const formattedMatches = [];
    
    for (const ranking of partialMatches) {
      try {
        const resume = await ranking.getResume();
        
        if (!resume) {
          console.warn(`No resume found for partial match ranking ${ranking.id}`);
          continue;
        }
        
        const match = {
          candidateName: resume.candidate_name || 'Unknown Candidate',
          email: resume.candidate_email || 'Not provided',
          skills: Array.isArray(resume.skills) ? resume.skills : [],
          score: Math.round(ranking.overall_score || 0),
          gaps: Array.isArray(ranking.gaps) ? ranking.gaps : ['Below minimum requirements']
        };
        
        formattedMatches.push(match);
      } catch (error) {
        console.error('Error formatting partial match:', error);
      }
    }
    
    console.log(`Formatted ${formattedMatches.length} partial matches`);
    return formattedMatches;
  }

  generateOverallAnalysis(job, allRankings) {
    if (!allRankings || allRankings.length === 0) {
      return `No candidates were successfully analyzed for the ${job.title} position.`;
    }

    const totalCandidates = allRankings.length;
    const avgScore = allRankings.reduce((sum, r) => sum + (r.overall_score || 0), 0) / totalCandidates;
    const topScore = allRankings[0]?.overall_score || 0;
    const qualifiedCandidates = allRankings.filter(r => (r.overall_score || 0) >= 70).length;

    let analysis = `Analysis Summary: We evaluated ${totalCandidates} candidates for the ${job.title} position. `;
    
    if (topScore >= 80) {
      analysis += `The top candidate shows excellent alignment with ${Math.round(topScore)}% compatibility. `;
    } else if (topScore >= 60) {
      analysis += `The top candidate shows good potential with ${Math.round(topScore)}% compatibility. `;
    } else {
      analysis += `The top candidate shows moderate fit with ${Math.round(topScore)}% compatibility. `;
    }

    if (qualifiedCandidates >= 3) {
      analysis += `${qualifiedCandidates} candidates meet the minimum qualification threshold. `;
    } else if (qualifiedCandidates > 0) {
      analysis += `${qualifiedCandidates} candidate(s) partially meet the requirements. `;
    } else {
      analysis += `No candidates fully meet all requirements, suggesting a need to expand search criteria. `;
    }

    analysis += `Average candidate compatibility: ${Math.round(avgScore)}%. `;
    
    // Add recommendation
    if (topScore >= 75) {
      analysis += `Recommendation: Proceed with interviews for top candidates - strong matches identified.`;
    } else if (topScore >= 60) {
      analysis += `Recommendation: Consider top candidates for initial screening, may require skills development.`;
    } else {
      analysis += `Recommendation: Review job requirements or expand candidate pool for better matches.`;
    }

    return analysis;
  }
}

module.exports = BackendCommunicationAgent;