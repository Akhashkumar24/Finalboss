import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const ProgressBar = ({ workflowStatus, isProcessing }) => {
  const steps = [
    { key: 'jdCompared', label: 'JD Compared', description: 'Analyzing job requirements' },
    { key: 'profilesRanked', label: 'Profiles Ranked', description: 'Ranking candidate matches' },
    { key: 'emailSent', label: 'Email Sent', description: 'Sending notifications' }
  ];

  const getStepStatus = (stepKey) => {
    if (workflowStatus[stepKey]) return 'completed';
    if (isProcessing) {
      const stepIndex = steps.findIndex(s => s.key === stepKey);
      const completedSteps = steps.slice(0, stepIndex).every(s => workflowStatus[s.key]);
      if (completedSteps) return 'processing';
    }
    return 'pending';
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'processing':
        return <Clock className="h-6 w-6 text-blue-500 animate-spin" />;
      default:
        return <Circle className="h-6 w-6 text-gray-300" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Workflow Progress</h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.key} className="relative">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getStepIcon(status)}
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${
                    status === 'completed' ? 'text-green-700' : 
                    status === 'processing' ? 'text-blue-700' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
              
              {!isLast && (
                <div className={`absolute left-3 top-8 w-0.5 h-8 ${
                  workflowStatus[step.key] ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;