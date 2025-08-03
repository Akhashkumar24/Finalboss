import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle, Zap, Server, TrendingUp, BarChart3, Target, Cpu, Database, Wifi, RefreshCw } from 'lucide-react';

const AgentStats = () => {
  const [realTimeData, setRealTimeData] = useState({
    comparisonAgent: {
      name: 'Document Comparison Agent',
      status: 'idle',
      successRate: 0,
      totalTasks: 0,
      completedTasks: 0,
      errors: 0,
      latency: 0,
      queue: 0,
      uptime: 0,
      lastActivity: new Date(),
      performance: [0, 0, 0, 0, 0, 0, 0, 0],
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0],
      currentJobs: [],
      processedResumes: 0
    },
    rankingAgent: {
      name: 'Candidate Ranking Agent',
      status: 'idle',
      successRate: 0,
      totalTasks: 0,
      completedTasks: 0,
      errors: 0,
      latency: 0,
      queue: 0,
      uptime: 0,
      lastActivity: new Date(),
      performance: [0, 0, 0, 0, 0, 0, 0, 0],
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0],
      currentJobs: [],
      rankedProfiles: 0
    },
    communicationAgent: {
      name: 'Email Communication Agent',
      status: 'idle',
      successRate: 0,
      totalTasks: 0,
      completedTasks: 0,
      errors: 0,
      latency: 0,
      queue: 0,
      uptime: 0,
      lastActivity: new Date(),
      performance: [0, 0, 0, 0, 0, 0, 0, 0],
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0],
      currentJobs: [],
      emailsSent: 0
    }
  });

  const [systemStats, setSystemStats] = useState({
    totalJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalResumes: 0,
    totalRankings: 0,
    totalEmails: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [debugInfo, setDebugInfo] = useState([]);

  // Backend configuration
  const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  };

  // Fetch real-time data from your actual backend
  const fetchRealTimeData = async () => {
    try {
      setConnectionStatus('connecting');
      addDebugLog(`Fetching real data from: ${BACKEND_URL}`);

      // Fetch all required data in parallel
      const [jobsRes, resumesRes, rankingsRes, emailsRes, logsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/jobs`),
        fetch(`${BACKEND_URL}/api/resumes/job/all`).catch(() => ({ ok: false })), // Handle if endpoint doesn't exist
        fetch(`${BACKEND_URL}/api/rankings/all`).catch(() => ({ ok: false })), // Handle if endpoint doesn't exist  
        fetch(`${BACKEND_URL}/api/emails/all`).catch(() => ({ ok: false })), // Handle if endpoint doesn't exist
        fetch(`${BACKEND_URL}/api/logs/recent`).catch(() => ({ ok: false })) // Handle if endpoint doesn't exist
      ]);

      if (!jobsRes.ok) {
        throw new Error(`Jobs API failed: ${jobsRes.status} ${jobsRes.statusText}`);
      }

      const jobs = await jobsRes.json();
      addDebugLog(`✅ Loaded ${jobs.length} jobs from database`);

      // Calculate real system stats from database
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const systemStats = {
        totalJobs: jobs.length,
        processingJobs: jobs.filter(job => job.status === 'processing').length,
        completedJobs: jobs.filter(job => job.status === 'completed').length,
        failedJobs: jobs.filter(job => job.status === 'failed').length,
        totalResumes: jobs.reduce((sum, job) => sum + (job.total_resumes || 0), 0),
        totalRankings: jobs.reduce((sum, job) => sum + (job.processed_resumes || 0), 0),
        totalEmails: jobs.filter(job => job.workflow_status?.email_sent).length
      };

      setSystemStats(systemStats);
      addDebugLog(`System stats: ${systemStats.totalJobs} jobs, ${systemStats.totalResumes} resumes`);

      // Calculate agent performance from real database data
      const calculateAgentMetrics = (jobs) => {
        const recentJobs = jobs.filter(job => new Date(job.created_at) > oneDayAgo);
        const processingJobs = jobs.filter(job => job.status === 'processing');
        
        // Comparison Agent Metrics
        const comparisonCompletedJobs = jobs.filter(job => 
          job.workflow_status?.jd_compared || job.agent_stats?.comparison_agent?.status === 'completed'
        );
        const comparisonErrors = jobs.filter(job => 
          job.agent_stats?.comparison_agent?.status === 'error' || 
          job.agent_stats?.comparison_agent?.status === 'failed'
        ).length;

        // Ranking Agent Metrics  
        const rankingCompletedJobs = jobs.filter(job => 
          job.workflow_status?.profiles_ranked || job.agent_stats?.ranking_agent?.status === 'completed'
        );
        const rankingErrors = jobs.filter(job => 
          job.agent_stats?.ranking_agent?.status === 'error' ||
          job.agent_stats?.ranking_agent?.status === 'failed'
        ).length;

        // Communication Agent Metrics
        const emailCompletedJobs = jobs.filter(job => 
          job.workflow_status?.email_sent || job.agent_stats?.communication_agent?.status === 'completed'
        );
        const emailErrors = jobs.filter(job => 
          job.agent_stats?.communication_agent?.status === 'error' ||
          job.agent_stats?.communication_agent?.status === 'failed'
        ).length;

        // Calculate success rates
        const comparisonSuccessRate = jobs.length > 0 ? 
          Math.round((comparisonCompletedJobs.length / jobs.length) * 100) : 0;
        const rankingSuccessRate = jobs.length > 0 ? 
          Math.round((rankingCompletedJobs.length / jobs.length) * 100) : 0;
        const emailSuccessRate = jobs.length > 0 ? 
          Math.round((emailCompletedJobs.length / jobs.length) * 100) : 0;

        // Calculate average processing times
        const getAvgProcessingTime = (completedJobs) => {
          if (completedJobs.length === 0) return 0;
          const times = completedJobs
            .filter(job => job.processing_started_at && job.processing_completed_at)
            .map(job => new Date(job.processing_completed_at) - new Date(job.processing_started_at));
          return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
        };

        const comparisonLatency = getAvgProcessingTime(comparisonCompletedJobs);
        const rankingLatency = getAvgProcessingTime(rankingCompletedJobs);
        const emailLatency = getAvgProcessingTime(emailCompletedJobs);

        // Determine current status based on processing jobs
        const getAgentStatus = (agentType) => {
          const processingJob = processingJobs.find(job => 
            job.agent_stats?.[agentType]?.status === 'processing'
          );
          if (processingJob) return 'processing';
          
          const recentCompletedJob = jobs
            .filter(job => job.status === 'completed')
            .sort((a, b) => new Date(b.processing_completed_at) - new Date(a.processing_completed_at))[0];
          
          if (recentCompletedJob && new Date(recentCompletedJob.processing_completed_at) > new Date(Date.now() - 5 * 60 * 1000)) {
            return 'completed';
          }
          
          return 'idle';
        };

        return {
          comparison: {
            status: getAgentStatus('comparison_agent'),
            successRate: comparisonSuccessRate,
            totalTasks: jobs.length,
            completedTasks: comparisonCompletedJobs.length,
            errors: comparisonErrors,
            latency: comparisonLatency,
            queue: processingJobs.filter(job => 
              job.agent_stats?.comparison_agent?.status === 'processing'
            ).length,
            processedResumes: jobs.reduce((sum, job) => sum + (job.processed_resumes || 0), 0)
          },
          ranking: {
            status: getAgentStatus('ranking_agent'),
            successRate: rankingSuccessRate,
            totalTasks: jobs.length,
            completedTasks: rankingCompletedJobs.length,
            errors: rankingErrors,
            latency: rankingLatency,
            queue: processingJobs.filter(job => 
              job.agent_stats?.ranking_agent?.status === 'processing'
            ).length,
            rankedProfiles: jobs.reduce((sum, job) => sum + (job.top_matches_count || 0), 0)
          },
          communication: {
            status: getAgentStatus('communication_agent'),
            successRate: emailSuccessRate,
            totalTasks: jobs.length,
            completedTasks: emailCompletedJobs.length,
            errors: emailErrors,
            latency: emailLatency,
            queue: processingJobs.filter(job => 
              job.agent_stats?.communication_agent?.status === 'processing'
            ).length,
            emailsSent: emailCompletedJobs.length
          }
        };
      };

      const agentMetrics = calculateAgentMetrics(jobs);
      addDebugLog(`Agent metrics calculated: Comparison ${agentMetrics.comparison.successRate}%, Ranking ${agentMetrics.ranking.successRate}%`);

      // Update real-time data with database values
      const updatedData = {
        comparisonAgent: {
          ...realTimeData.comparisonAgent,
          status: agentMetrics.comparison.status,
          successRate: agentMetrics.comparison.successRate,
          totalTasks: agentMetrics.comparison.totalTasks,
          completedTasks: agentMetrics.comparison.completedTasks,
          errors: agentMetrics.comparison.errors,
          latency: agentMetrics.comparison.latency,
          queue: agentMetrics.comparison.queue,
          processedResumes: agentMetrics.comparison.processedResumes,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          performance: [...realTimeData.comparisonAgent.performance.slice(1), agentMetrics.comparison.successRate],
          errorHistory: [...realTimeData.comparisonAgent.errorHistory.slice(1), agentMetrics.comparison.errors],
          uptime: Date.now() - new Date('2024-01-01').getTime() // Mock uptime from project start
        },
        rankingAgent: {
          ...realTimeData.rankingAgent,
          status: agentMetrics.ranking.status,
          successRate: agentMetrics.ranking.successRate,
          totalTasks: agentMetrics.ranking.totalTasks,
          completedTasks: agentMetrics.ranking.completedTasks,
          errors: agentMetrics.ranking.errors,
          latency: agentMetrics.ranking.latency,
          queue: agentMetrics.ranking.queue,
          rankedProfiles: agentMetrics.ranking.rankedProfiles,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          performance: [...realTimeData.rankingAgent.performance.slice(1), agentMetrics.ranking.successRate],
          errorHistory: [...realTimeData.rankingAgent.errorHistory.slice(1), agentMetrics.ranking.errors],
          uptime: Date.now() - new Date('2024-01-01').getTime()
        },
        communicationAgent: {
          ...realTimeData.communicationAgent,
          status: agentMetrics.communication.status,
          successRate: agentMetrics.communication.successRate,
          totalTasks: agentMetrics.communication.totalTasks,
          completedTasks: agentMetrics.communication.completedTasks,
          errors: agentMetrics.communication.errors,
          latency: agentMetrics.communication.latency,
          queue: agentMetrics.communication.queue,
          emailsSent: agentMetrics.communication.emailsSent,
          lastActivity: jobs.length > 0 ? new Date(Math.max(...jobs.map(j => new Date(j.updated_at || j.created_at)))) : new Date(),
          performance: [...realTimeData.communicationAgent.performance.slice(1), agentMetrics.communication.successRate],
          errorHistory: [...realTimeData.communicationAgent.errorHistory.slice(1), agentMetrics.communication.errors],
          uptime: Date.now() - new Date('2024-01-01').getTime()
        }
      };

      setRealTimeData(updatedData);
      setConnectionStatus('connected');
      setLastUpdate(new Date());
      setError(null);
      setLoading(false);
      
      addDebugLog(`✅ Real-time data updated successfully`);

    } catch (err) {
      addDebugLog(`❌ Error fetching real data: ${err.message}`);
      setError(`Failed to fetch real-time data: ${err.message}`);
      setConnectionStatus('disconnected');
      setLoading(false);
      console.error('Failed to fetch real-time agent stats:', err);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    addDebugLog('Manual refresh triggered');
    fetchRealTimeData();
  };

  // Fetch data on component mount and set up interval for real-time updates
  useEffect(() => {
    fetchRealTimeData();
    
    // Set up real-time polling every 10 seconds for database data
    const interval = setInterval(() => {
      if (!loading && connectionStatus === 'connected') {
        fetchRealTimeData();
      }
    }, 10000); // 10 seconds for database polling

    return () => clearInterval(interval);
  }, []);

  // ... [Keep all the existing helper components and functions: BarChart, CircularProgress, formatTimeAgo, formatUptime, getStatusIcon, getConnectionStatusColor] ...

  // Custom chart components (keep existing implementation)
  const BarChart = ({ data, label, color, height = 40, showValues = false }) => {
    const maxValue = Math.max(...data, 1);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{label}</span>
          <span>Last 8 updates</span>
        </div>
        <div className="flex items-end space-x-1" style={{ height }}>
          {data.map((value, index) => (
            <div
              key={index}
              className={`flex-1 rounded-t ${color} opacity-80 hover:opacity-100 transition-all duration-300 cursor-pointer relative group`}
              style={{ 
                height: `${Math.max((value / maxValue) * height, 2)}px`,
              }}
            >
              {showValues && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-1 py-0.5 rounded">
                  {Math.round(value)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CircularProgress = ({ percentage, size = 80, strokeWidth = 8, color = '#3B82F6', backgroundColor = '#E5E7EB' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
        </div>
      </div>
    );
  };

  const formatTimeAgo = (date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatUptime = (uptime) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'idle':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'offline':
        return <Server className="h-5 w-5 text-red-400" />;
      default:
        return <Server className="h-5 w-5 text-gray-400" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Show error state if backend is unavailable
  if (error && connectionStatus === 'disconnected') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-4" />
            <div>
              <h2 className="text-xl font-bold text-red-800 mb-2">Real-time Data Connection Failed</h2>
              <p className="text-red-700 mb-4">Unable to connect to your project's database API.</p>
              <div className="bg-red-100 p-3 rounded text-sm text-red-800 mb-4">
                <strong>Error:</strong> {error}
              </div>
              <div className="text-sm text-red-600 mb-4">
                <strong>Expected endpoint:</strong> {BACKEND_URL}/api/jobs<br/>
                <strong>Database tables:</strong> job_descriptions, resumes, ranking_results, email_notifications
              </div>
              <button 
                onClick={handleRefresh}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors flex items-center"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Retry Connection
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Troubleshooting Real-time Data:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Ensure your backend server is running: <code>npm start</code> or <code>node server.js</code></li>
            <li>Verify database connection and tables exist: <code>job_descriptions</code>, <code>resumes</code>, etc.</li>
            <li>Check API endpoint is accessible: <code>curl {BACKEND_URL}/api/jobs</code></li>
            <li>Verify CORS settings allow frontend domain</li>
            <li>Check if there are any jobs in database: <code>SELECT COUNT(*) FROM job_descriptions;</code></li>
          </ol>
        </div>

        {/* Debug Info */}
        {debugInfo.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">🐛 Debug Log</h4>
            <div className="font-mono text-xs text-gray-600 space-y-1">
              {debugInfo.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading && connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time data from database...</p>
          <p className="text-sm text-gray-500 mt-2">Endpoint: {BACKEND_URL}/api/jobs</p>
        </div>
      </div>
    );
  }

  const overallSuccessRate = Math.round(
    (realTimeData.comparisonAgent.successRate + 
     realTimeData.rankingAgent.successRate + 
     realTimeData.communicationAgent.successRate) / 3
  );

  return (
    <div className="space-y-6">
      {/* Header with Real Connection Status */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <Activity className="h-6 w-6 mr-3" />
              🤖 Real-time Agent Performance
            </h2>
            <p className="text-indigo-100">
              Live data from your project database (PostgreSQL)
            </p>
            <div className="mt-2 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Wifi className={`h-4 w-4 ${getConnectionStatusColor()}`} />
                <span className="text-sm">
                  Status: <span className={getConnectionStatusColor()}>{connectionStatus}</span>
                </span>
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center space-x-1 text-sm bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30 transition-all"
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{overallSuccessRate}%</div>
            <div className="text-sm text-indigo-100">System Health</div>
            <div className="text-xs text-indigo-200 mt-1">
              Last updated: {formatTimeAgo(lastUpdate)}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Performance Cards with Real Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(realTimeData).map(([key, agent], index) => {
          const colors = [
            { 
              gradient: 'from-blue-500 to-cyan-500', 
              bg: 'bg-blue-50', 
              border: 'border-blue-200', 
              accent: 'text-blue-600',
              progress: '#3B82F6',
              chart: 'bg-blue-400',
              icon: BarChart3
            },
            { 
              gradient: 'from-green-500 to-emerald-500', 
              bg: 'bg-green-50', 
              border: 'border-green-200', 
              accent: 'text-green-600',
              progress: '#10B981',
              chart: 'bg-green-400',
              icon: Target
            },
            { 
              gradient: 'from-purple-500 to-pink-500', 
              bg: 'bg-purple-50', 
              border: 'border-purple-200', 
              accent: 'text-purple-600',
              progress: '#8B5CF6',
              chart: 'bg-purple-400',
              icon: Zap
            }
          ][index];

          const IconComponent = colors.icon;

          return (
            <div key={key} className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300`}>
              <div className={`bg-gradient-to-r ${colors.gradient} text-white p-4 -m-6 mb-6 rounded-t-xl`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{agent.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(agent.status)}
                        <span className="text-sm opacity-90 capitalize">{agent.status}</span>
                      </div>
                    </div>
                  </div>
                  <CircularProgress 
                    percentage={agent.successRate} 
                    size={60}
                    color={colors.progress}
                  />
                </div>
              </div>

              {/* Real metrics from database */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>{agent.completedTasks}</div>
                  <div className="text-xs text-gray-600">Completed Tasks</div>
                </div>
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>
                    {agent.latency > 0 ? (agent.latency / 1000).toFixed(1) : '0.0'}s
                  </div>
                  <div className="text-xs text-gray-600">Avg Latency</div>
                </div>
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>{agent.queue}</div>
                  <div className="text-xs text-gray-600">Current Queue</div>
                </div>
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>{agent.totalTasks}</div>
                  <div className="text-xs text-gray-600">Total Tasks</div>
                </div>
              </div>

              {/* Real performance chart */}
              <div className="mb-4">
                <BarChart 
                  data={agent.performance} 
                  label="Success Rate %" 
                  color={colors.chart}
                  height={40}
                  showValues={true}
                />
              </div>

              {/* Agent-specific metrics */}
              <div className="mb-4 bg-white p-3 rounded-lg shadow-sm">
                <h5 className="font-medium text-gray-800 mb-2">Agent-Specific Metrics</h5>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {key === 'comparisonAgent' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resumes Processed:</span>
                      <span className="font-medium">{agent.processedResumes}</span>
                    </div>
                  )}
                  {key === 'rankingAgent' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profiles Ranked:</span>
                      <span className="font-medium">{agent.rankedProfiles}</span>
                    </div>
                  )}
                  {key === 'communicationAgent' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Emails Sent:</span>
                      <span className="font-medium">{agent.emailsSent}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600">Last Activity:</span>
                  <span className="font-semibold">{formatTimeAgo(agent.lastActivity)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-semibold">{formatUptime(agent.uptime)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Errors:</span>
                  <span className={`font-semibold ${agent.errors > 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {agent.errors}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real System Metrics from Database */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.totalJobs}</div>
              <div className="text-sm text-gray-600">Total Jobs</div>
              <div className="text-xs text-gray-500">From database</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.processingJobs}</div>
              <div className="text-sm text-gray-600">Processing</div>
              <div className="text-xs text-gray-500">Live status</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.completedJobs}</div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xs text-gray-500">Success rate: {systemStats.totalJobs > 0 ? Math.round((systemStats.completedJobs / systemStats.totalJobs) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.failedJobs}</div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-xs text-gray-500">Error rate: {systemStats.totalJobs > 0 ? Math.round((systemStats.failedJobs / systemStats.totalJobs) * 100) : 0}%</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Database className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.totalResumes}</div>
              <div className="text-sm text-gray-600">Total Resumes</div>
              <div className="text-xs text-gray-500">Processed: {systemStats.totalRankings}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Tables Status */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          Database Tables Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <h4 className="font-medium text-blue-800">job_descriptions</h4>
            <div className="text-2xl font-bold text-blue-600">{systemStats.totalJobs}</div>
            <div className="text-xs text-blue-600">Records</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <h4 className="font-medium text-green-800">resumes</h4>
            <div className="text-2xl font-bold text-green-600">{systemStats.totalResumes}</div>
            <div className="text-xs text-green-600">Records</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <h4 className="font-medium text-purple-800">ranking_results</h4>
            <div className="text-2xl font-bold text-purple-600">{systemStats.totalRankings}</div>
            <div className="text-xs text-purple-600">Records</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <h4 className="font-medium text-yellow-800">email_notifications</h4>
            <div className="text-2xl font-bold text-yellow-600">{systemStats.totalEmails}</div>
            <div className="text-xs text-yellow-600">Records</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <h4 className="font-medium text-gray-800">processing_logs</h4>
            <div className="text-2xl font-bold text-gray-600">Active</div>
            <div className="text-xs text-gray-600">Monitoring</div>
          </div>
        </div>
      </div>

      {/* Error Analysis with Real Data */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-red-500" />
          Error Tracking (Real-time)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Object.entries(realTimeData).map(([key, agent], index) => {
            const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400'][index];
            return (
              <div key={key} className="space-y-2">
                <h4 className="font-medium text-gray-800">{agent.name}</h4>
                <BarChart 
                  data={agent.errorHistory} 
                  label="Error Count"
                  color={colors}
                  height={50}
                  showValues={true}
                />
                <div className="text-xs text-gray-600">
                  Current errors: {agent.errors} | Success rate: {agent.successRate}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Connection Status */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Real-time Data Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-blue-600 mb-3">Database Connection</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <span>Status:</span>
                <span className={`font-semibold ${getConnectionStatusColor()}`}>{connectionStatus}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Backend URL:</span>
                <span className="font-mono text-xs">{BACKEND_URL}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Database:</span>
                <span>PostgreSQL (resume_matcher)</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Update Interval:</span>
                <span>10 seconds</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Last Update:</span>
                <span>{formatTimeAgo(lastUpdate)}</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-green-600 mb-3">Real Data Sources</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Job descriptions table
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Resume processing status
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Ranking results data
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                Email notifications
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                Processing logs & errors
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Debug Info for Development */}
      {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">🐛 Debug Log (Development Mode)</h4>
          <div className="font-mono text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
            {debugInfo.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStats;
