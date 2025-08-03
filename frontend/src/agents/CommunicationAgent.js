class CommunicationAgent {
  constructor(agentManager) {
    this.agentManager = agentManager;
    this.status = 'idle';
    this.startTime = null;
  }

  async processCommunication(rankingResults, arRequestorEmail) {
    this.status = 'processing';
    this.startTime = Date.now();
    
    this.agentManager.updateAgentStats('communicationAgent', {
      status: 'processing',
      queue: 1
    });

    try {
      const { topMatches, overallExplanation, totalCandidates } = rankingResults;
      
      let emailContent;
      let notificationMessage;

      if (topMatches.length >= 3) {
        // Send top 3 matches to AR requestor
        emailContent = this.generateMatchEmail(topMatches, overallExplanation, totalCandidates);
        notificationMessage = `Successfully found and sent top 3 matching candidates to ${arRequestorEmail}`;
        
        await this.sendEmail(arRequestorEmail, 'Top 3 Consultant Matches Found', emailContent);
        
        this.agentManager.updateWorkflowStatus({ emailSent: true });
      } else {
        // Notify recruiter of no suitable matches
        const recruiterEmail = 'recruiter@company.com'; // This would be configurable
        emailContent = this.generateNoMatchEmail(topMatches, overallExplanation, totalCandidates);
        notificationMessage = `No suitable matches found. Notified recruiter at ${recruiterEmail}`;
        
        await this.sendEmail(recruiterEmail, 'No Suitable Matches Found', emailContent);
      }

      const latency = Date.now() - this.startTime;
      this.status = 'completed';
      
      this.agentManager.updateAgentStats('communicationAgent', {
        status: 'completed',
        queue: 0,
        latency: latency
      });

      this.agentManager.addNotification({
        type: 'success',
        message: notificationMessage,
        agent: 'communicationAgent'
      });

      return {
        success: true,
        emailSent: true,
        message: notificationMessage
      };
    } catch (error) {
      this.status = 'error';
      this.agentManager.updateAgentStats('communicationAgent', {
        status: 'error',
        errors: 1
      });
      
      this.agentManager.addNotification({
        type: 'error',
        message: `Communication Agent Error: ${error.message}`,
        agent: 'communicationAgent'
      });
      
      throw error;
    }
  }

  generateMatchEmail(topMatches, explanation, totalCandidates) {
    return `
      <h2>Top 3 Consultant Matches Found</h2>
      <p>We've analyzed ${totalCandidates} consultant profiles and found excellent matches for your job requirement.</p>
      
      <h3>Top Matches:</h3>
      ${topMatches.map((match, index) => `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h4>${index + 1}. ${match.profile.name}</h4>
          <p><strong>Email:</strong> ${match.profile.email}</p>
          <p><strong>Match Score:</strong> ${match.matchScore}%</p>
          <p><strong>Skills:</strong> ${match.profile.skills.join(', ')}</p>
          <p><strong>Experience:</strong> ${match.profile.experience}</p>
          <p><strong>Domain:</strong> ${match.profile.domain}</p>
          <p><strong>Why this candidate:</strong> ${match.rankingExplanation}</p>
          <p><strong>Strengths:</strong> ${match.strengths.join(', ')}</p>
          ${match.gaps.length > 0 ? `<p><strong>Areas for consideration:</strong> ${match.gaps.join(', ')}</p>` : ''}
        </div>
      `).join('')}
      
      <h3>Overall Analysis:</h3>
      <p>${explanation}</p>
      
      <p>Please review these candidates and let us know if you need any additional information.</p>
      <p>Best regards,<br>AI Recruitment System</p>
    `;
  }

  generateNoMatchEmail(matches, explanation, totalCandidates) {
    return `
      <h2>No Suitable Matches Found</h2>
      <p>After analyzing ${totalCandidates} consultant profiles, we were unable to find 3 suitable matches that meet the job requirements.</p>
      
      ${matches.length > 0 ? `
        <h3>Partial Matches Found:</h3>
        ${matches.map((match, index) => `
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h4>${index + 1}. ${match.profile.name}</h4>
            <p><strong>Email:</strong> ${match.profile.email}</p>
            <p><strong>Match Score:</strong> ${match.matchScore}%</p>
            <p><strong>Skills:</strong> ${match.profile.skills.join(', ')}</p>
            <p><strong>Gaps:</strong> ${match.gaps.join(', ')}</p>
          </div>
        `).join('')}` : ''}
      
      <h3>Recommendations:</h3>
      <ul>
        <li>Consider expanding the search criteria</li>
        <li>Review job requirements for flexibility</li>
        <li>Post the position for external recruitment</li>
        <li>Consider training existing consultants</li>
      </ul>
      
      <p>Please review the job requirements and contact the recruitment team for further assistance.</p>
      <p>Best regards,<br>AI Recruitment System</p>
    `;
  }

  async sendEmail(to, subject, content) {
    // Simulate email sending - in real implementation, use actual email service
    console.log(`EMAIL SENT TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${content}`);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, messageId: `msg_${Date.now()}` };
  }

  getStatus() {
    return {
      status: this.status,
      startTime: this.startTime
    };
  }
}

export default CommunicationAgent;