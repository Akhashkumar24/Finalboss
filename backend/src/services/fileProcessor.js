const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

class FileProcessor {
  constructor() {
    this.supportedTypes = ['.pdf', '.docx', '.doc', '.txt', '.csv'];
  }

  async processFile(filePath, originalName) {
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      switch (ext) {
        case '.pdf':
          return await this.processPDF(filePath, originalName);
        case '.docx':
        case '.doc':
          return await this.processDOCX(filePath, originalName);
        case '.txt':
          return await this.processTXT(filePath, originalName);
        case '.csv':
          return await this.processCSV(filePath, originalName);
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      console.error(`Error processing file ${originalName}:`, error);
      throw new Error(`Failed to process ${originalName}: ${error.message}`);
    }
  }

  async processPDF(filePath, originalName) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;
      
      return this.extractCandidateInfo(text, originalName);
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  async processDOCX(filePath, originalName) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      return this.extractCandidateInfo(text, originalName);
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  async processTXT(filePath, originalName) {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      return this.extractCandidateInfo(text, originalName);
    } catch (error) {
      throw new Error(`TXT processing failed: ${error.message}`);
    }
  }

  async processCSV(filePath, originalName) {
    return new Promise((resolve, reject) => {
      const candidates = [];
      const headers = [];
      let isFirstRow = true;

      createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          if (isFirstRow) {
            isFirstRow = false;
          }
          
          try {
            const candidate = this.processCSVRow(row, candidates.length + 1);
            candidates.push(candidate);
          } catch (error) {
            console.error('Error processing CSV row:', error);
          }
        })
        .on('end', () => {
          resolve({
            type: 'multiple',
            candidates: candidates,
            extractedText: `CSV file with ${candidates.length} candidates`,
            candidateName: `${candidates.length} candidates from CSV`
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV processing failed: ${error.message}`));
        });
    });
  }

  processCSVRow(row, index) {
    // Common CSV column mappings
    const nameFields = ['name', 'full_name', 'candidate_name', 'first_name', 'last_name'];
    const emailFields = ['email', 'email_address', 'contact_email', 'e_mail'];
    const skillsFields = ['skills', 'technical_skills', 'competencies', 'technologies', 'expertise'];
    const experienceFields = ['experience', 'years_experience', 'work_experience', 'exp_years'];
    const phoneFields = ['phone', 'phone_number', 'contact_number', 'mobile'];

    const candidateName = this.findFieldValue(row, nameFields) || `Candidate ${index}`;
    const email = this.findFieldValue(row, emailFields) || null;
    const skillsStr = this.findFieldValue(row, skillsFields) || '';
    const experience = this.findFieldValue(row, experienceFields) || null;
    const phone = this.findFieldValue(row, phoneFields) || null;

    // Process skills
    const skills = skillsStr ? 
      skillsStr.split(/[,;|\/]/).map(s => s.trim()).filter(s => s.length > 0) : 
      [];

    // Create text representation
    const extractedText = Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return {
      candidateName,
      email,
      skills,
      experience,
      extractedText,
      contactInfo: {
        email,
        phone
      },
      domain: this.inferDomain(skills)
    };
  }

  extractCandidateInfo(text, originalName) {
    // Extract candidate name
    const candidateName = this.extractName(text, originalName);
    
    // Extract email
    const email = this.extractEmail(text);
    
    // Extract phone
    const phone = this.extractPhone(text);
    
    // Extract skills
    const skills = this.extractSkills(text);
    
    // Extract experience
    const experience = this.extractExperience(text);
    
    // Extract education
    const education = this.extractEducation(text);
    
    // Infer domain
    const domain = this.inferDomain(skills);

    return {
      candidateName,
      email,
      skills,
      experience,
      domain,
      education,
      extractedText: text.substring(0, 2000), // Limit text length
      contactInfo: {
        email,
        phone
      }
    };
  }

  extractName(text, originalName) {
    // First, try to extract email and derive name from it
    const email = this.extractEmail(text);
    if (email) {
      const nameFromEmail = this.extractNameFromEmail(email);
      if (nameFromEmail && nameFromEmail !== 'Unknown Candidate') {
        return nameFromEmail;
      }
    }

    // Try various patterns to extract name from text
    const patterns = [
      // Look for name at the beginning of the document
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m,
      // Look for "Name:" followed by the name
      /(?:name|full\s*name)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // Look for name in common resume formats
      /^([A-Z][A-Z\s]+[A-Z])\s*\n/m, // ALL CAPS name
      // Look for capitalized words at the start (more flexible)
      /^([A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)*)/m,
      // Look for name after common prefixes
      /(?:candidate|applicant)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // Any sequence of capitalized words (less restrictive)
      /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    ];

    const lines = text.split('\n');
    
    // Check first few lines more carefully
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 0 && line.length < 100) {
        // Skip lines that are obviously not names
        if (this.isLikelyName(line)) {
          const cleanName = this.cleanNameString(line);
          if (cleanName && cleanName.length > 3 && cleanName.length < 50) {
            return cleanName;
          }
        }
      }
    }

    // Try patterns on full text
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = this.cleanNameString(match[1]);
        if (name && this.isLikelyName(name)) {
          return name;
        }
      }
    }

    // Try to extract from filename
    const nameFromFile = this.generateNameFromFilename(originalName);
    if (nameFromFile && nameFromFile !== 'Unknown Candidate') {
      return nameFromFile;
    }

    // Final fallback: if we have email, try harder to extract name
    if (email) {
      const emailName = this.extractNameFromEmail(email, true); // Force extraction
      if (emailName) {
        return emailName;
      }
    }

    return 'Unknown Candidate';
  }

  extractNameFromEmail(email, forceExtract = false) {
    if (!email) return null;
    
    const localPart = email.split('@')[0];
    
    // Remove common patterns
    let cleanLocal = localPart
      .replace(/\d+/g, '') // Remove numbers
      .replace(/[._-]/g, '') // Remove separators
      .toLowerCase();
    
    // If it's too short and we're not forcing, skip
    if (!forceExtract && cleanLocal.length < 4) return null;
    
    // Try to identify if it looks like a name
    if (cleanLocal.length >= 4) {
      // Convert to proper case
      const name = cleanLocal.charAt(0).toUpperCase() + cleanLocal.slice(1);
      
      // If it looks like a concatenated name, try to split
      if (name.length > 8) {
        // Simple heuristic: if there's a pattern like "firstlast"
        const possibleSplit = this.splitConcatenatedName(name);
        if (possibleSplit) {
          return possibleSplit;
        }
      }
      
      return name;
    }
    
    return null;
  }

  splitConcatenatedName(name) {
    // Try to find common name patterns
    const commonFirstNames = ['sethu', 'raj', 'kumar', 'ram', 'krishna', 'vijay', 'arun', 'suresh', 'ganesh'];
    const nameLen = name.length;
    
    for (let i = 3; i <= nameLen - 3; i++) {
      const first = name.substring(0, i).toLowerCase();
      const last = name.substring(i);
      
      if (commonFirstNames.some(common => first.includes(common))) {
        return name.substring(0, i) + ' ' + last;
      }
    }
    
    // If name is long enough, split roughly in middle
    if (nameLen > 10) {
      const mid = Math.floor(nameLen / 2);
      return name.substring(0, mid) + ' ' + name.substring(mid);
    }
    
    return null;
  }

  isLikelyName(str) {
    if (!str || str.length < 2) return false;
    
    // Skip if it contains too many non-letter characters
    const letterCount = (str.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < str.length * 0.7) return false;
    
    // Skip common non-name words
    const nonNameWords = [
      'resume', 'cv', 'curriculum', 'vitae', 'profile', 'contact', 'address',
      'phone', 'email', 'linkedin', 'github', 'objective', 'summary',
      'experience', 'education', 'skills', 'projects', 'data', 'science',
      'engineer', 'developer', 'analyst', 'manager', 'senior', 'junior'
    ];
    
    const lowerStr = str.toLowerCase();
    if (nonNameWords.some(word => lowerStr.includes(word))) return false;
    
    // Check if it looks like a proper name (starts with capital, reasonable length)
    return /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/.test(str.trim());
  }

  cleanNameString(str) {
    return str
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  extractEmail(text) {
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = text.match(emailPattern);
    return match ? match[1] : null;
  }

  extractPhone(text) {
    const phonePatterns = [
      /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/,
      /(\+\d{1,3}[\s-]?)?(\d{3}[\s-]?\d{3}[\s-]?\d{4})/
    ];

    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return null;
  }

  extractSkills(text) {
    const skillKeywords = [
      // Programming Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL', 'HTML', 'CSS', 'Sass', 'Less',
      
      // Frontend Technologies
      'React', 'Vue.js', 'Angular', 'Svelte', 'jQuery', 'Bootstrap', 'Tailwind CSS',
      'Material-UI', 'Chakra UI', 'Styled Components', 'Webpack', 'Vite', 'Parcel',
      
      // Backend Technologies
      'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel',
      'Rails', 'ASP.NET', 'Fastify', 'Koa.js', 'NestJS',
      
      // Databases
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Cassandra',
      'DynamoDB', 'InfluxDB', 'Neo4j', 'Elasticsearch',
      
      // Cloud & DevOps
      'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Jenkins',
      'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible', 'Vagrant',
      
      // Data Science & ML
      'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
      'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'Apache Spark',
      'Hadoop', 'Kafka', 'Airflow',
      
      // Mobile Development
      'React Native', 'Flutter', 'iOS', 'Android', 'Xamarin', 'Ionic',
      
      // Tools & Others
      'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'Figma', 'Adobe',
      'Photoshop', 'Illustrator', 'Postman', 'Insomnia'
    ];

    const foundSkills = [];
    const textLower = text.toLowerCase();

    skillKeywords.forEach(skill => {
      if (textLower.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    // Also look for skills in common sections
    const skillSections = text.match(/(?:skills?|technologies?|competencies)[:\s]*([^\n]*(?:\n[^\n]*){0,5})/gi);
    if (skillSections) {
      skillSections.forEach(section => {
        const sectionSkills = skillKeywords.filter(skill => 
          section.toLowerCase().includes(skill.toLowerCase())
        );
        foundSkills.push(...sectionSkills);
      });
    }

    // Remove duplicates and return
    return [...new Set(foundSkills)];
  }

  extractExperience(text) {
    const patterns = [
      /(\d+)[\s]*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
      /experience[:\s]*(\d+)[\s]*(?:years?|yrs?)/i,
      /(\d+)\+?\s*(?:years?|yrs?)\s*experience/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `${match[1]} years`;
      }
    }

    // Try to infer from work history
    const workHistoryPattern = /(?:work\s+history|employment|experience)[:\s]*([\s\S]*?)(?:\n\s*\n|education|skills)/i;
    const workMatch = text.match(workHistoryPattern);
    if (workMatch) {
      const yearMatches = workMatch[1].match(/\d{4}/g);
      if (yearMatches && yearMatches.length >= 2) {
        const years = yearMatches.map(y => parseInt(y)).sort();
        const experience = new Date().getFullYear() - years[0];
        return `${Math.max(1, experience)} years`;
      }
    }

    return null;
  }

  extractEducation(text) {
    const educationPattern = /(?:education|academic|degree)[:\s]*([\s\S]*?)(?:\n\s*\n|experience|skills|work)/i;
    const match = text.match(educationPattern);
    
    if (match) {
      const educationText = match[1].trim();
      const degrees = [];
      
      // Look for degree types
      const degreePatterns = [
        /bachelor'?s?(?:\s+of\s+|\s+in\s+|\s+)([^\n,]+)/gi,
        /master'?s?(?:\s+of\s+|\s+in\s+|\s+)([^\n,]+)/gi,
        /phd?(?:\s+in\s+|\s+)([^\n,]+)/gi,
        /doctorate(?:\s+in\s+|\s+)([^\n,]+)/gi
      ];

      degreePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(educationText)) !== null) {
          degrees.push({
            type: match[0].split(/\s+in\s+|\s+of\s+/)[0].trim(),
            field: match[1].trim()
          });
        }
      });

      return {
        raw: educationText.substring(0, 500),
        degrees
      };
    }

    return {};
  }

  inferDomain(skills) {
    if (!skills || skills.length === 0) return 'Technology';

    const domainKeywords = {
      'Data Science': ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'R', 'Jupyter'],
      'Frontend Development': ['React', 'Vue.js', 'Angular', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Sass'],
      'Backend Development': ['Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'Java', 'Python'],
      'Full Stack Development': ['React', 'Node.js', 'JavaScript', 'TypeScript', 'MongoDB', 'PostgreSQL'],
      'Mobile Development': ['React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin'],
      'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Jenkins', 'Terraform', 'Ansible'],
      'Cloud Engineering': ['AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes']
    };

    let maxScore = 0;
    let inferredDomain = 'Technology';

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      const score = keywords.filter(keyword => 
        skills.some(skill => skill.toLowerCase().includes(keyword.toLowerCase()))
      ).length;

      if (score > maxScore) {
        maxScore = score;
        inferredDomain = domain;
      }
    });

    return inferredDomain;
  }

  findFieldValue(obj, possibleKeys) {
    for (const key of possibleKeys) {
      const lowerKey = key.toLowerCase();
      for (const [objKey, value] of Object.entries(obj)) {
        if (objKey.toLowerCase().includes(lowerKey) && value) {
          return value.toString().trim();
        }
      }
    }
    return null;
  }

  generateNameFromFilename(filename) {
    let nameBase = filename
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .replace(/resume|cv|profile/gi, '') // Remove common resume words
      .replace(/\d+/g, '') // Remove numbers
      .trim();

    // Skip if it's obviously not a name
    const lowerName = nameBase.toLowerCase();
    const skipWords = ['linkedin', 'data', 'science', 'engineer', 'developer', 'analyst', 'manager'];
    if (skipWords.some(word => lowerName === word || lowerName.includes(word))) {
      return null;
    }

    if (nameBase.length > 2 && nameBase.length < 50) {
      const words = nameBase.split(' ')
        .filter(word => word.length > 0 && word.length > 1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      
      if (words.length > 0 && words.length <= 4) {
        return words.join(' ');
      }
    }

    return null;
  }
}

module.exports = new FileProcessor();