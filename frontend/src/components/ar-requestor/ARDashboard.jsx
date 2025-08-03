import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import SubmitJD from './SubmitJD';
import MatchingResults from './MatchingResults';
import ProgressBar from '../common/ProgressBar';
import { FileText, Users, Mail, AlertCircle } from 'lucide-react';

const ARDashboard = () => {
  const { state } = useAppContext();
  const [currentView, setCurrentView] = useState('submit');

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEmailStatus = () => {
    if (state.workflowStatus.emailSent) return 'sent';
    if (state.isProcessing) return 'pending';
    return 'not_sent';
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">JD Comparison</h3>
              <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getStatusColor(state.workflowStatus.jdCompared ? 'completed' : 
                              state.isProcessing ? 'processing' : 'pending')
              }`}>
                {state.workflowStatus.jdCompared ? 'Completed' : 
                 state.isProcessing ? 'In Progress' : 'Pending'}
              </p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
          {state.currentJD && (
            <p className="text-sm text-gray-600 mt-2">
              Current JD loaded
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Top Matches</h3>
              <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                state.matchingResults.topMatches?.length >= 3 ? 'text-green-600 bg-green-100' :
                state.matchingResults.topMatches?.length > 0 ? 'text-yellow-600 bg-yellow-100' :
                'text-gray-600 bg-gray-100'
              }`}>
                {state.matchingResults.topMatches?.length >= 3 ? 'Found 3+ Matches' :
                 state.matchingResults.topMatches?.length > 0 ? `Found ${state.matchingResults.topMatches.length} Matches` :
                 'Not Found'}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
          {state.matchingResults.topMatches?.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              Top candidate: {state.matchingResults.topMatches[0].profile?.name || state.matchingResults.topMatches[0].candidateName}
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Email Status</h3>
              <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                getEmailStatus() === 'sent' ? 'text-green-600 bg-green-100' :
                getEmailStatus() === 'pending' ? 'text-blue-600 bg-blue-100' :
                'text-gray-600 bg-gray-100'
              }`}>
                {getEmailStatus() === 'sent' ? 'Sent' :
                 getEmailStatus() === 'pending' ? 'Pending' : 'Not Sent'}
              </p>
            </div>
            <Mail className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setCurrentView('submit')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'submit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Submit Job Description
            </button>
            <button
              onClick={() => setCurrentView('progress')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Progress Tracking
            </button>
            <button
              onClick={() => setCurrentView('results')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Matching Results
            </button>
          </nav>
        </div>

        <div className="p-6">
          {currentView === 'submit' && <SubmitJD />}
          {currentView === 'progress' && (
            <ProgressBar 
              workflowStatus={state.workflowStatus} 
              isProcessing={state.isProcessing} 
            />
          )}
          {currentView === 'results' && <MatchingResults />}
        </div>
      </div>

      {/* Notifications */}
      {state.notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {state.notifications.slice(-5).reverse().map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  notification.type === 'error' ? 'bg-red-50' :
                  notification.type === 'success' ? 'bg-green-50' :
                  'bg-blue-50'
                }`}
              >
                <AlertCircle className={`h-5 w-5 mt-0.5 ${
                  notification.type === 'error' ? 'text-red-500' :
                  notification.type === 'success' ? 'text-green-500' :
                  'text-blue-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleString()} • {notification.agent}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ARDashboard;