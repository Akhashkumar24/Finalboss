import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import AgentManager from '../../agents/AgentManager';
import LoadingSpinner from '../common/LoadingSpinner';
import { Send, FileText, Mail } from 'lucide-react';

const SubmitJD = () => {
  const { state, dispatch } = useAppContext();
  const [jobDescription, setJobDescription] = useState('');
  const [arRequestorEmail, setArRequestorEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [agentManager] = useState(() => new AgentManager(dispatch));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Filter files to only include supported resume formats
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.csv'];
    const filteredFiles = files.filter(file => {
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return supportedExtensions.includes(extension);
    });
    
    if (filteredFiles.length !== files.length) {
      const skippedCount = files.length - filteredFiles.length;
      alert(`${skippedCount} file(s) were skipped as they are not supported formats. Supported formats: PDF, DOC, DOCX, TXT, CSV`);
    }
    
    setSelectedFiles(filteredFiles);
    
    // Clear the other input
    if (e.target.id === 'resumeFiles') {
      document.getElementById('folderUpload').value = '';
    } else {
      document.getElementById('resumeFiles').value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!jobDescription.trim() || !arRequestorEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please select at least one resume file');
      return;
    }

    try {
      // Set the current JD
      dispatch({ type: 'SET_JD', payload: jobDescription });
      
      // Start the workflow with files
      await agentManager.startWorkflow(
        jobDescription,
        selectedFiles,
        arRequestorEmail
      );
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      alert('Failed to start the matching process. Please try again.');
    }
  };

  const sampleJD = `Job Title: Senior Full Stack Developer

We are looking for an experienced Senior Full Stack Developer to join our dynamic team. The ideal candidate will have strong expertise in modern web technologies and a passion for building scalable applications.

Key Requirements:
- 4+ years of experience in full stack development
- Proficiency in React.js, Node.js, and JavaScript/TypeScript
- Experience with databases (MongoDB, PostgreSQL)
- Knowledge of cloud platforms (AWS, Azure)
- Strong understanding of REST APIs and GraphQL
- Experience with containerization (Docker, Kubernetes)
- Excellent problem-solving and communication skills

Responsibilities:
- Develop and maintain web applications using modern frameworks
- Design and implement RESTful APIs
- Collaborate with cross-functional teams
- Ensure application performance and scalability
- Participate in code reviews and technical discussions

Nice to Have:
- Experience with microservices architecture
- Knowledge of DevOps practices
- Familiarity with agile development methodologies`;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Submit Job Description for AI Matching</h3>
        <p className="text-blue-700">
          Enter your job description and email to start the automated consultant matching process. 
          Our AI agents will analyze and rank the best matches for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="arEmail" className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Mail className="h-4 w-4 mr-2" />
            AR Requestor Email *
          </label>
          <input
            type="email"
            id="arEmail"
            value={arRequestorEmail}
            onChange={(e) => setArRequestorEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your.email@company.com"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Results will be sent to this email address
          </p>
        </div>

        <div>
          <label htmlFor="jobDescription" className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 mr-2" />
            Job Description *
          </label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the complete job description including requirements, responsibilities, and qualifications..."
            required
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Characters: {jobDescription.length}
            </p>
            <button
              type="button"
              onClick={() => setJobDescription(sampleJD)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Use Sample JD
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Upload Resume Files</h4>
          <p className="text-sm text-gray-600 mb-3">
            Select individual files or upload an entire folder containing resumes (PDF, DOC, DOCX, TXT formats supported)
          </p>
          
          <div className="space-y-3">
            {/* Individual file upload */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Upload Individual Files</label>
              <input
                type="file"
                id="resumeFiles"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Folder upload */}
            <div className="border-t pt-3">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Upload Entire Folder</label>
              <input
                type="file"
                id="folderUpload"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFileSelect}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will upload all files from the selected folder
              </p>
            </div>
          </div>
          {selectedFiles.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({selectedFiles.length}):
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-600 bg-white p-2 rounded border">
                    <FileText className="h-3 w-3 mr-2" />
                    <span className="truncate">{file.name}</span>
                    <span className="ml-auto text-gray-400">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={state.isProcessing}
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isProcessing ? (
            <LoadingSpinner size="small" text="Processing..." />
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Start AI Matching Process
            </>
          )}
        </button>
      </form>

      {state.isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">🤖 AI Processing in Progress</p>
          <p className="text-yellow-700 text-sm mb-3">
            Our AI agents are analyzing your job description and ranking consultant profiles. 
            This process typically takes 3-9 minutes depending on the number of resumes.
          </p>
          <div className="bg-yellow-100 rounded-lg p-3">
            <p className="text-yellow-800 text-xs font-medium mb-2">Current Process:</p>
            <ul className="text-yellow-700 text-xs space-y-1">
              <li>• Uploading and parsing resume files</li>
              <li>• AI-powered content analysis with Gemini</li>
              <li>• Skills matching and scoring</li>
              <li>• Candidate ranking and explanation generation</li>
              <li>• Email notification preparation</li>
            </ul>
            <p className="text-yellow-600 text-xs mt-2 font-medium">
              ⏱️ Please wait - the system will notify you when complete
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitJD;