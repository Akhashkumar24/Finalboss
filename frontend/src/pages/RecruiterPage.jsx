import React from 'react';
import RecruiterDashboard from '../components/recruiter/RecruiterDashboard';
import { Users } from 'lucide-react';

const RecruiterPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Recruiter Admin Console</h1>
          </div>
          <p className="text-gray-600">
            Monitor agent performance, search job descriptions, and generate recruitment analytics
          </p>
        </div>
        
        <RecruiterDashboard />
      </div>
    </div>
  );
};

export default RecruiterPage;