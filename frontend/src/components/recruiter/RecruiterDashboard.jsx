import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import JDSearch from './JDSearch';
import AgentStats from './AgentStats';

const RecruiterDashboard = () => {
  const { state } = useAppContext();
  const [currentView, setCurrentView] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({
    totalJDs: 0,
    successfulMatches: 0,
    avgProcessingTime: '0s',
    activeProfiles: 0,
    successRate: 0,
    processingTimeChange: 0,
    totalNotifications: 0,
    agentErrors: 0,
    workflowCompleted: false
  });

  // Calculate real metrics from application state
  const calculateDashboardMetrics = React.useCallback(() => {
    // Calculate metrics based on current state structure
    const totalJDs = state.currentJD ? 1 : 0; // Count current JD if exists
    
    // Check if current JD has successful matches
    const hasMatches = state.matchingResults?.rankedProfiles?.length > 0;
    const successfulMatches = hasMatches ? 1 : 0;
    const successRate = totalJDs > 0 ? Math.round((successfulMatches / totalJDs) * 100) : 0;
    
    // Get active/ranked profiles count
    const activeProfiles = state.matchingResults?.rankedProfiles?.length || 0;
    
    // Calculate processing time from workflow completion
    const workflowCompleted = state.workflowStatus.jdCompared && 
                             state.workflowStatus.profilesRanked && 
                             state.workflowStatus.emailSent;
    
    // Estimate processing time based on agent stats (mock calculation)
    const avgLatency = (
      (state.agentStats.comparisonAgent?.latency || 0) +
      (state.agentStats.rankingAgent?.latency || 0) +
      (state.agentStats.communicationAgent?.latency || 0)
    ) / 3;
    
    let avgProcessingTime = '0s';
    if (avgLatency > 0) {
      const seconds = Math.round(avgLatency / 1000); // Convert from ms to seconds
      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        avgProcessingTime = `${minutes}m ${remainingSeconds}s`;
      } else {
        avgProcessingTime = `${seconds}s`;
      }
    }

    // Count agent activities and errors for more meaningful metrics
    const totalNotifications = state.notifications?.length || 0;
    const agentErrors = Object.values(state.agentStats).reduce((sum, agent) => sum + (agent.errors || 0), 0);

    setDashboardStats({
      totalJDs: totalNotifications > 0 ? Math.max(totalJDs, 1) : totalJDs, // Show at least 1 if there's activity
      successfulMatches,
      avgProcessingTime,
      activeProfiles,
      successRate,
      processingTimeChange: 0,
      totalNotifications,
      agentErrors,
      workflowCompleted
    });
  }, [state]);

  // Calculate real metrics from application state
  useEffect(() => {
    calculateDashboardMetrics();
  }, [calculateDashboardMetrics]);

  // Get recent activity from actual notifications
  const getRecentActivity = () => {
    return (state.notifications || [])
      .filter(notification => notification.message && notification.timestamp)
      .slice(-5)
      .reverse();
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total JDs Processed</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalJDs}</p>
              <p className="text-xs text-gray-600">
                {dashboardStats.totalJDs === 0 ? 'No JDs processed yet' : 'Total processed'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Successful Matches</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.successfulMatches}</p>
              <p className="text-xs text-green-600">{dashboardStats.successRate}% success rate</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.avgProcessingTime}</p>
              <p className="text-xs text-blue-600">
                {dashboardStats.totalJDs === 0 ? 'No data yet' : 'Average time'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Profiles</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeProfiles}</p>
              <p className="text-xs text-gray-600">Available for matching</p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setCurrentView('overview')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics Overview
            </button>
            <button
              onClick={() => setCurrentView('search')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              JD Search & Filters
            </button>
            <button
              onClick={() => setCurrentView('agents')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'agents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Agent Performance
            </button>
          </nav>
        </div>

        <div className="p-6">
          {currentView === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {getRecentActivity().length > 0 ? (
                    getRecentActivity().map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-3 bg-white rounded border">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleString()} • {notification.agent || 'System'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No recent activity. Start by creating a job description to see activity here.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Real Data Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold mb-3">Current Workflow Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">JD Compared:</span>
                      <span className={`text-sm font-medium ${state.workflowStatus.jdCompared ? 'text-green-600' : 'text-gray-400'}`}>
                        {state.workflowStatus.jdCompared ? '✓ Complete' : '○ Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Profiles Ranked:</span>
                      <span className={`text-sm font-medium ${state.workflowStatus.profilesRanked ? 'text-green-600' : 'text-gray-400'}`}>
                        {state.workflowStatus.profilesRanked ? '✓ Complete' : '○ Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Email Sent:</span>
                      <span className={`text-sm font-medium ${state.workflowStatus.emailSent ? 'text-green-600' : 'text-gray-400'}`}>
                        {state.workflowStatus.emailSent ? '✓ Complete' : '○ Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold mb-3">Agent Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Comparison Agent:</span>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          state.agentStats.comparisonAgent?.status === 'active' ? 'bg-green-100 text-green-800' : 
                          state.agentStats.comparisonAgent?.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {state.agentStats.comparisonAgent?.status || 'idle'}
                        </span>
                        <p className="text-xs text-gray-500">
                          Queue: {state.agentStats.comparisonAgent?.queue || 0} | 
                          Errors: {state.agentStats.comparisonAgent?.errors || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Ranking Agent:</span>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          state.agentStats.rankingAgent?.status === 'active' ? 'bg-green-100 text-green-800' : 
                          state.agentStats.rankingAgent?.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {state.agentStats.rankingAgent?.status || 'idle'}
                        </span>
                        <p className="text-xs text-gray-500">
                          Queue: {state.agentStats.rankingAgent?.queue || 0} | 
                          Errors: {state.agentStats.rankingAgent?.errors || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Communication Agent:</span>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          state.agentStats.communicationAgent?.status === 'active' ? 'bg-green-100 text-green-800' : 
                          state.agentStats.communicationAgent?.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {state.agentStats.communicationAgent?.status || 'idle'}
                        </span>
                        <p className="text-xs text-gray-500">
                          Queue: {state.agentStats.communicationAgent?.queue || 0} | 
                          Errors: {state.agentStats.communicationAgent?.errors || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'search' && <JDSearch />}

          {currentView === 'agents' && <AgentStats />}
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;