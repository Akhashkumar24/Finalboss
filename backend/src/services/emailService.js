const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'techtitans.mavericks@gmail.com',
        pass: process.env.SMTP_PASS || 'lbnd cgvt wznl rjqx'
      }
    });

    this.fromEmail = process.env.EMAIL_FROM || 'techtitans.mavericks@gmail.com';
  }

  async sendTopMatchesEmail(requestorEmail, jobTitle, topMatches, overallAnalysis) {
    const subject = `Top Candidate Matches Found - ${jobTitle}`;
    const htmlContent = this.generateTopMatchesHTML(jobTitle, topMatches, overallAnalysis);
    
    return await this.sendEmail(requestorEmail, subject, htmlContent);
  }

  async sendNoMatchesEmail(recruiterEmail, jobTitle, candidatesAnalyzed, partialMatches = []) {
    const subject = `No Suitable Matches Found - ${jobTitle}`;
    const htmlContent = this.generateNoMatchesHTML(jobTitle, candidatesAnalyzed, partialMatches);
    
    return await this.sendEmail(recruiterEmail, subject, htmlContent);
  }

  async sendEmail(to, subject, htmlContent) {
    try {
      const mailOptions = {
        from: `"TechTitans AI Recruiter" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: this.htmlToText(htmlContent) // Fallback plain text
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        to: to,
        subject: subject
      };

    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  generateTopMatchesHTML(jobTitle, topMatches, overallAnalysis) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Top Candidate Matches - ${jobTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .candidate { border: 2px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 25px; background: #fafbfc; }
          .candidate.rank-1 { border-color: #28a745; background: #f8fff9; }
          .candidate.rank-2 { border-color: #ffc107; background: #fffdf7; }
          .candidate.rank-3 { border-color: #17a2b8; background: #f7fdff; }
          .rank-badge { display: inline-block; background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
          .rank-1 .rank-badge { background: #28a745; }
          .rank-2 .rank-badge { background: #ffc107; color: #000; }
          .rank-3 .rank-badge { background: #17a2b8; }
          .candidate-name { font-size: 20px; font-weight: bold; color: #2c3e50; margin: 10px 0; }
          .score { font-size: 18px; font-weight: bold; color: #e74c3c; }
          .skills { margin: 10px 0; }
          .skill-tag { display: inline-block; background: #3498db; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; margin: 2px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 15px 0; }
          .metric { text-align: center; background: white; padding: 10px; border-radius: 6px; border: 1px solid #dee2e6; }
          .metric-value { font-size: 18px; font-weight: bold; color: #495057; }
          .metric-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
          .explanation { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2196f3; }
          .strengths { background: #e8f5e8; padding: 10px; border-radius: 6px; margin: 10px 0; }
          .gaps { background: #fff3cd; padding: 10px; border-radius: 6px; margin: 10px 0; }
          .overall-analysis { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #dee2e6; }
          .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Candidate Analysis Complete!</h1>
            <p>Job Position: ${jobTitle}</p>
            <p>Analysis Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <p>Our AI-powered recruitment system has completed the analysis of candidate profiles for your position. Here are the results ranked by compatibility:</p>

          ${topMatches.map((candidate, index) => `
            <div class="candidate rank-${index + 1}">
              <div class="rank-badge">#${index + 1} Candidate</div>
              
              <div class="candidate-name">${candidate.candidateName}</div>
              <div class="score">🌟 Overall Match Score: ${candidate.score}%</div>
              
              <p><strong>📧 Email:</strong> ${candidate.email || 'Not provided'}</p>
              <p><strong>💼 Experience:</strong> ${candidate.experience || 'Not specified'}</p>
              <p><strong>🏢 Domain:</strong> ${candidate.domain || 'Technology'}</p>

              <div class="metrics">
                <div class="metric">
                  <div class="metric-value">${candidate.skillsMatch}%</div>
                  <div class="metric-label">Skills Match</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${candidate.experienceScore}%</div>
                  <div class="metric-label">Experience</div>
                </div>
                <div class="metric">
                  <div class="metric-value">${candidate.contextualRelevance}%</div>
                  <div class="metric-label">Context Fit</div>
                </div>
              </div>

              <div class="skills">
                <strong>🛠️ Key Skills:</strong><br>
                ${candidate.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>

              <div class="explanation">
                <strong>🤖 AI Analysis:</strong><br>
                ${candidate.explanation || candidate.reasoning}
              </div>

              ${candidate.strengths && candidate.strengths.length > 0 ? `
                <div class="strengths">
                  <strong>✅ Key Strengths:</strong>
                  <ul>
                    ${candidate.strengths.map(strength => `<li>${strength}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${candidate.gaps && candidate.gaps.length > 0 ? `
                <div class="gaps">
                  <strong>⚠️ Areas for Consideration:</strong>
                  <ul>
                    ${candidate.gaps.map(gap => `<li>${gap}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${index === 0 && topMatches.length > 1 ? `
                <div style="margin-top: 15px; padding: 10px; background: #d4edda; border-radius: 6px; border: 1px solid #c3e6cb;">
                  <strong>🏆 Why This Candidate Ranks #1:</strong><br>
                  ${this.generateRankingComparison(candidate, topMatches[1])}
                </div>
              ` : ''}
            </div>
          `).join('')}

          ${overallAnalysis ? `
            <div class="overall-analysis">
              <h3>📋 Overall Recruitment Analysis</h3>
              <p>${overallAnalysis}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Ready to move forward?</strong></p>
            <p>We recommend starting with the #1 candidate and conducting initial interviews with all top 3 matches.</p>
          </div>

          <div class="footer">
            <p>This analysis was generated by TechTitans AI Recruitment System</p>
            <p>Powered by Advanced AI • Candidate Matching • Smart Recruitment</p>
            <p style="margin-top: 15px; font-size: 12px;">
              This email was sent automatically based on your job requirements. 
              The AI analysis is based on document similarity, skills matching, and contextual relevance.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNoMatchesHTML(jobTitle, candidatesAnalyzed, partialMatches) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>No Suitable Matches - ${jobTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; }
          .stats { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .recommendations { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
          .partial-match { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 10px 0; border: 1px solid #ffeaa7; }
          .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Recruitment Analysis Complete</h1>
            <p>Job Position: ${jobTitle}</p>
            <p>Analysis Date: ${new Date().toLocaleDateString()}</p>
          </div>

          <p>We have completed the analysis of candidate profiles for your job posting. Here's what we found:</p>

          <div class="stats">
            <h3>📊 Analysis Summary</h3>
            <ul>
              <li><strong>Total Candidates Analyzed:</strong> ${candidatesAnalyzed}</li>
              <li><strong>Suitable Matches Found:</strong> 0</li>
              <li><strong>Partial Matches:</strong> ${partialMatches.length}</li>
            </ul>
          </div>

          ${partialMatches.length > 0 ? `
            <h3>⚠️ Partial Matches</h3>
            <p>While no candidates met all requirements, these profiles showed some alignment:</p>
            ${partialMatches.map(match => `
              <div class="partial-match">
                <strong>${match.candidateName}</strong> - ${match.score}% match<br>
                <small>Skills: ${match.skills.join(', ')}</small><br>
                <small>Gaps: ${match.gaps.join(', ')}</small>
              </div>
            `).join('')}
          ` : ''}

          <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
              <li><strong>Expand Search Criteria:</strong> Consider relaxing some requirements or experience levels</li>
              <li><strong>Review Job Requirements:</strong> Assess if all listed skills are truly essential</li>
              <li><strong>External Recruitment:</strong> Post the position on job boards and professional networks</li>
              <li><strong>Training Programs:</strong> Consider candidates with transferable skills who can be trained</li>
              <li><strong>Referral Programs:</strong> Leverage employee networks for recommendations</li>
            </ul>
          </div>

          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bee5eb;">
            <h3>🔄 Next Steps</h3>
            <ol>
              <li>Review and potentially adjust job requirements</li>
              <li>Expand candidate sourcing channels</li>
              <li>Consider remote or contract candidates</li>
              <li>Schedule a consultation with our recruitment team</li>
            </ol>
          </div>

          <div class="footer">
            <p>This analysis was generated by TechTitans AI Recruitment System</p>
            <p>Contact our recruitment team for assistance with expanding your candidate pool</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateRankingComparison(topCandidate, secondCandidate) {
    const reasons = [];
    
    if (topCandidate.score > secondCandidate.score) {
      reasons.push(`Higher overall compatibility (${topCandidate.score}% vs ${secondCandidate.score}%)`);
    }
    
    if (topCandidate.skillsMatch > secondCandidate.skillsMatch) {
      reasons.push(`Better skills alignment (${topCandidate.skillsMatch}% vs ${secondCandidate.skillsMatch}%)`);
    }
    
    if (topCandidate.experienceScore > secondCandidate.experienceScore) {
      reasons.push(`More relevant experience (${topCandidate.experienceScore}% vs ${secondCandidate.experienceScore}%)`);
    }

    if (reasons.length === 0) {
      return "This candidate demonstrates the best overall fit based on our comprehensive AI analysis.";
    }

    return reasons.join(', ') + '.';
  }

  htmlToText(html) {
    // Simple HTML to text conversion for email fallback
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();