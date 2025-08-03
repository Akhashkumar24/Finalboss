import React from 'react';
import ARDashboard from '../components/ar-requestor/ARDashboard';
import { FileText } from 'lucide-react';

const ARRequestorPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">AR Requestor Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Submit job descriptions and track AI-powered consultant matching progress
          </p>
        </div>
        
        <ARDashboard />
      </div>
    </div>
  );
};

export default ARRequestorPage;