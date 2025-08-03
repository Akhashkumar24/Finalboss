import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Search, Filter, Download, Eye, Calendar, User, FileText, Mail, RefreshCw } from 'lucide-react';

const JDSearch = () => {
  const { state } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [jdHistory, setJdHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/jobs');
      if (response.ok) {
        const data = await response.json();
        setJdHistory(data.map(job => ({
          id: job.id,
          title: job.title,
          content: job.content,
          requiredSkills: job.required_skills || extractSkillsFromContent(job.content),
          experienceLevel: job.experience_level || inferExperienceLevel(job.content),
          status: job.status,
          submittedDate: job.created_at,
          matchesFound: job.processed_resumes || 0,
          requestorEmail: job.requestor_email,
          totalResumes: job.total_resumes || 0,
          processedResumes: job.processed_resumes || 0
        })));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Fallback to empty array if fetch fails
      setJdHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const extractSkillsFromContent = (content) => {
    const skillKeywords = ['React', 'Node.js', 'Python', 'Java', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Machine Learning', 'TensorFlow', 'Spring Boot', 'Microservices', 'JavaScript', 'TypeScript', 'Angular', 'Vue.js', 'Express.js', 'Django', 'Flask', 'Kubernetes'];
    const foundSkills = [];
    const contentLower = content.toLowerCase();
    
    skillKeywords.forEach(skill => {
      if (contentLower.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    return foundSkills.slice(0, 6); // Limit to top 6 skills
  };

  const inferExperienceLevel = (content) => {
    const contentLower = content.toLowerCase();
    if (contentLower.includes('senior') || contentLower.includes('lead') || contentLower.includes('5+ years') || contentLower.includes('4+ years')) {
      return 'senior';
    } else if (contentLower.includes('junior') || contentLower.includes('entry') || contentLower.includes('1-2 years')) {
      return 'junior';
    }
    return 'mid';
  };

  const allSkills = ['React', 'Node.js', 'Python', 'Java', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Machine Learning', 'TensorFlow', 'Spring Boot', 'Microservices', 'JavaScript', 'TypeScript', 'Angular', 'Vue.js'];

  const filteredJDs = jdHistory.filter(jd => {
    const matchesSearch = jd.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         jd.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         jd.requestorEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSkills = selectedSkills.length === 0 || 
                         selectedSkills.some(skill => jd.requiredSkills.includes(skill));
    
    const matchesExperience = experienceFilter === 'all' || jd.experienceLevel === experienceFilter;
    const matchesStatus = statusFilter === 'all' || jd.status === statusFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const jobDate = new Date(jd.submittedDate);
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          matchesDate = jobDate >= filterDate;
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          matchesDate = jobDate >= filterDate;
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          matchesDate = jobDate >= filterDate;
          break;
      }
    }
    
    return matchesSearch && matchesSkills && matchesExperience && matchesStatus && matchesDate;
  });

  const handleSkillToggle = (skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const exportResults = () => {
    const csvContent = [
      ['JD ID', 'Title', 'Skills', 'Experience', 'Status', 'Matches Found', 'Date'],
      ...filteredJDs.map(jd => [
        jd.id,
        jd.title,
        jd.requiredSkills.join('; '),
        jd.experienceLevel,
        jd.status,
        jd.matchesFound,
        jd.submittedDate
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jd_search_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">JD Search & Analytics</h3>
        <p className="text-blue-700">
          Search and filter job descriptions, view matching results, and generate reports for recruitment analysis.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by JD title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex space-x-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Experience</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={fetchJobs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Skills Filter */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Skills
          </label>
          <div className="flex flex-wrap gap-2">
            {allSkills.map(skill => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          {selectedSkills.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setSelectedSkills([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all skill filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredJDs.length} of {jdHistory.length} job descriptions
          </p>
          <div className="flex space-x-4 text-sm">
            <span className="text-green-600">
              {filteredJDs.filter(jd => jd.status === 'completed').length} Completed
            </span>
            <span className="text-blue-600">
              {filteredJDs.filter(jd => jd.status === 'processing').length} Processing
            </span>
            <span className="text-red-600">
              {filteredJDs.filter(jd => jd.status === 'failed').length} Failed
            </span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JD Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Skills</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matches</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJDs.map((jd) => (
                <tr key={jd.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{jd.title}</div>
                      <div className="text-sm text-gray-500">{jd.id}</div>
                      <div className="text-xs text-gray-400">{jd.requestorEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {jd.requiredSkills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="capitalize">{jd.experienceLevel}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(jd.status)}`}>
                      {jd.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{jd.matchesFound} matches</div>
                    <div className="text-xs text-gray-500">
                      {jd.matchesFound >= 3 ? 'Good matches' : jd.matchesFound > 0 ? 'Some matches' : 'No matches'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(jd.submittedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => setSelectedJob(jd)}
                      className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredJDs.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or filters to find more results.
            </p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Match Success Rate</h4>
          <div className="text-3xl font-bold text-green-600">
            {filteredJDs.length > 0 ? Math.round((filteredJDs.filter(jd => jd.matchesFound >= 3).length / filteredJDs.length) * 100) : 0}%
          </div>
          <p className="text-sm text-gray-600">JDs with 3+ matches</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Avg Matches per JD</h4>
          <div className="text-3xl font-bold text-blue-600">
            {filteredJDs.length > 0 ? (filteredJDs.reduce((sum, jd) => sum + jd.matchesFound, 0) / filteredJDs.length).toFixed(1) : 0}
          </div>
          <p className="text-sm text-gray-600">Average matches found</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Processing Rate</h4>
          <div className="text-3xl font-bold text-purple-600">
            {filteredJDs.length > 0 ? Math.round((filteredJDs.filter(jd => jd.status === 'completed').length / filteredJDs.length) * 100) : 0}%
          </div>
          <p className="text-sm text-gray-600">Successfully processed</p>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h2>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Job Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Job ID:</span>
                      <span className="font-mono text-xs">{selectedJob.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedJob.status)}`}>
                        {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Requestor:</span>
                      <span>{selectedJob.requestorEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted:</span>
                      <span>{new Date(selectedJob.submittedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Experience Level:</span>
                      <span className="capitalize">{selectedJob.experienceLevel}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Processing Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Resumes:</span>
                      <span>{selectedJob.totalResumes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed:</span>
                      <span>{selectedJob.processedResumes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matches Found:</span>
                      <span className="font-semibold text-green-600">{selectedJob.matchesFound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span>
                        {selectedJob.totalResumes ? 
                          Math.round((selectedJob.processedResumes / selectedJob.totalResumes) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Skills */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.requiredSkills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Job Description */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Job Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {selectedJob.content}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Loading job descriptions...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JDSearch;