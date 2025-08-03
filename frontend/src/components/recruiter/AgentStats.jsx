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
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0]
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
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0]
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
      errorHistory: [0, 0, 0, 0, 0, 0, 0, 0]
    }
  });

  const [systemStats, setSystemStats] = useState({
    totalJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalResumes: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [debugInfo, setDebugInfo] = useState([]);

  // Add debug logging
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  };

  // Backend configuration - detect environment with port fallbacks
  const getBackendUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return process.env.REACT_APP_API_URL || 'http://localhost:5001'; // Default to 5001 based on your code
    }
    return process.env.REACT_APP_API_URL || '';
  };

  const BACKEND_URL = getBackendUrl();
  const COMMON_PORTS = ['5001', '5000', '3001', '8000']; // Common backend ports to try

  // Try connecting to different ports if the main one fails
  const tryMultiplePorts = async () => {
    const baseUrl = BACKEND_URL.replace(/:\d+$/, ''); // Remove port if present
    
    for (const port of COMMON_PORTS) {
      try {
        const testUrl = `${baseUrl}:${port}`;
        addDebugLog(`Trying port ${port}: ${testUrl}`);
        
        const response = await fetch(`${testUrl}/api/agents/stats`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout per port
        });
        
        if (response.ok) {
          addDebugLog(`✅ Success on port ${port}`);
          return { url: testUrl, data: await response.json() };
        }
      } catch (error) {
        addDebugLog(`❌ Port ${port} failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error(`Failed to connect to any common ports: ${COMMON_PORTS.join(', ')}`);
  };

  // Fetch real agent stats from your backend
  const fetchAgentStats = async () => {
    try {
      setConnectionStatus('connecting');
      addDebugLog(`Primary attempt: ${BACKEND_URL || 'relative URL'}`);
      
      let backendData;
      let successfulUrl = BACKEND_URL;
      
      try {
        // First, try the configured URL
        const endpoint = BACKEND_URL ? `${BACKEND_URL}/api/agents/stats` : '/api/agents/stats';
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        backendData = await response.json();
        addDebugLog(`✅ Connected to primary URL: ${BACKEND_URL}`);
        
      } catch (primaryError) {
        addDebugLog(`❌ Primary URL failed: ${primaryError.message}`);
        
        // If primary fails, try multiple ports
        addDebugLog(`🔄 Trying alternative ports...`);
        const result = await tryMultiplePorts();
        backendData = result.data;
        successfulUrl = result.url;
        addDebugLog(`✅ Connected via port discovery: ${successfulUrl}`);
      }
      
      setConnectionStatus('connected');
      setLastUpdate(new Date());
      setError(null);
      
      // Transform real backend data to frontend structure
      const transformedData = {
        comparisonAgent: {
          name: 'Document Comparison Agent',
          status: backendData.comparisonAgent?.status || 'offline',
          successRate: backendData.comparisonAgent?.successRate || 0,
          totalTasks: backendData.comparisonAgent?.totalTasks || 0,
          completedTasks: backendData.comparisonAgent?.completedTasks || 0,
          errors: backendData.comparisonAgent?.errors || 0,
          latency: backendData.comparisonAgent?.latency || 0,
          queue: backendData.comparisonAgent?.queue || 0,
          uptime: backendData.comparisonAgent?.uptime || 0,
          lastActivity: backendData.comparisonAgent?.lastActivity ? 
            new Date(backendData.comparisonAgent.lastActivity) : new Date(),
          performance: [...realTimeData.comparisonAgent.performance.slice(1), 
            backendData.comparisonAgent?.successRate || 0],
          errorHistory: [...realTimeData.comparisonAgent.errorHistory.slice(1), 
            backendData.comparisonAgent?.errors || 0]
        },
        rankingAgent: {
          name: 'Candidate Ranking Agent',
          status: backendData.rankingAgent?.status || 'offline',
          successRate: backendData.rankingAgent?.successRate || 0,
          totalTasks: backendData.rankingAgent?.totalTasks || 0,
          completedTasks: backendData.rankingAgent?.completedTasks || 0,
          errors: backendData.rankingAgent?.errors || 0,
          latency: backendData.rankingAgent?.latency || 0,
          queue: backendData.rankingAgent?.queue || 0,
          uptime: backendData.rankingAgent?.uptime || 0,
          lastActivity: backendData.rankingAgent?.lastActivity ? 
            new Date(backendData.rankingAgent.lastActivity) : new Date(),
          performance: [...realTimeData.rankingAgent.performance.slice(1), 
            backendData.rankingAgent?.successRate || 0],
          errorHistory: [...realTimeData.rankingAgent.errorHistory.slice(1), 
            backendData.rankingAgent?.errors || 0]
        },
        communicationAgent: {
          name: 'Email Communication Agent',
          status: backendData.communicationAgent?.status || 'offline',
          successRate: backendData.communicationAgent?.successRate || 0,
          totalTasks: backendData.communicationAgent?.totalTasks || 0,
          completedTasks: backendData.communicationAgent?.completedTasks || 0,
          errors: backendData.communicationAgent?.errors || 0,
          latency: backendData.communicationAgent?.latency || 0,
          queue: backendData.communicationAgent?.queue || 0,
          uptime: backendData.communicationAgent?.uptime || 0,
          lastActivity: backendData.communicationAgent?.lastActivity ? 
            new Date(backendData.communicationAgent.lastActivity) : new Date(),
          performance: [...realTimeData.communicationAgent.performance.slice(1), 
            backendData.communicationAgent?.successRate || 0],
          errorHistory: [...realTimeData.communicationAgent.errorHistory.slice(1), 
            backendData.communicationAgent?.errors || 0]
        }
      };

      // Set system stats from backend
      if (backendData.systemStats) {
        setSystemStats({
          totalJobs: backendData.systemStats.totalJobs || 0,
          processingJobs: backendData.systemStats.processingJobs || 0,
          completedJobs: backendData.systemStats.completedJobs || 0,
          failedJobs: backendData.systemStats.failedJobs || 0,
          totalResumes: backendData.systemStats.totalResumes || 0
        });
        addDebugLog(`System stats updated: ${backendData.systemStats.totalJobs} jobs, ${backendData.systemStats.totalResumes} resumes`);
      }

      setRealTimeData(transformedData);
      setLoading(false);
        
    } catch (err) {
      addDebugLog(`❌ Backend connection failed: ${err.message}`);
      setError(`Connection failed: ${err.message}`);
      setConnectionStatus('disconnected');
      setLoading(false);
      
      // Don't fallback to mock data - show the error instead
      console.error('Failed to fetch agent stats:', err);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    addDebugLog('Manual refresh triggered');
    fetchAgentStats();
  };

  // Fetch data on component mount and set up interval
  useEffect(() => {
    fetchAgentStats();
    
    // Set up real-time polling every 5 seconds
    const interval = setInterval(() => {
      if (!loading && connectionStatus === 'connected') {
        fetchAgentStats();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Custom chart components
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
              <h2 className="text-xl font-bold text-red-800 mb-2">Backend Connection Failed</h2>
              <p className="text-red-700 mb-4">Unable to connect to the agent statistics API.</p>
              <div className="bg-red-100 p-3 rounded text-sm text-red-800 mb-4">
                <strong>Error:</strong> {error}
              </div>
              <div className="text-sm text-red-600 mb-4">
                <strong>Expected endpoint:</strong> {BACKEND_URL || 'relative URL'}/api/agents/stats<br/>
                <strong>Ports tried:</strong> {COMMON_PORTS.join(', ')}
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
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Check if your backend server is running: <code>npm start</code> or <code>node server.js</code></li>
            <li>Verify your backend is running on one of these ports: <strong>{COMMON_PORTS.join(', ')}</strong></li>
            <li>Test the endpoint manually: <code>curl {BACKEND_URL}/api/agents/stats</code></li>
            <li>Check CORS settings in your backend allow: <code>http://localhost:3000</code></li>
            <li>Set environment variable: <code>REACT_APP_API_URL=http://localhost:5001</code></li>
            <li>Restart both frontend and backend after changes</li>
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
          <p className="text-gray-600">Connecting to backend API...</p>
          <p className="text-sm text-gray-500 mt-2">Endpoint: {BACKEND_URL || 'relative URL'}/api/agents/stats</p>
          <div className="mt-4 text-xs text-gray-400 max-w-md">
            {debugInfo.map((log, i) => (
              <div key={i} className="text-left">{log}</div>
            ))}
          </div>
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
              🤖 AI Agent Dashboard
            </h2>
            <p className="text-indigo-100">
              Real-time data from your backend API
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

      {/* Agent Performance Cards */}
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

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>{agent.completedTasks}</div>
                  <div className="text-xs text-gray-600">Completed Tasks</div>
                </div>
                <div className="text-center bg-white p-3 rounded-lg shadow-sm">
                  <div className={`text-2xl font-bold ${colors.accent}`}>{(agent.latency / 1000).toFixed(1)}s</div>
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

              <div className="mb-4">
                <BarChart 
                  data={agent.performance} 
                  label="Success Rate %" 
                  color={colors.chart}
                  height={40}
                  showValues={true}
                />
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

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{systemStats.totalJobs}</div>
              <div className="text-sm text-gray-600">Total Jobs</div>
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
            </div>
          </div>
        </div>
      </div>

      {/* Error Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-red-500" />
          Error Tracking
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
                  Current errors: {agent.errors}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connection Status Info */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Connection Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-blue-600 mb-3">Backend API Connection</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <span>Status:</span>
                <span className={`font-semibold ${getConnectionStatusColor()}`}>{connectionStatus}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Backend URL:</span>
                <span className="font-mono text-xs">{BACKEND_URL || 'relative'}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Endpoint:</span>
                <span className="font-mono text-xs">/api/agents/stats</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Update Interval:</span>
                <span>5 seconds</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Last Update:</span>
                <span>{formatTimeAgo(lastUpdate)}</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-green-600 mb-3">Live Data Sources</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Agent status & queues
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Task completion stats
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Error tracking
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                System performance
              </li>
            </ul>
          </div>
        </div>
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
};

export default AgentStats;