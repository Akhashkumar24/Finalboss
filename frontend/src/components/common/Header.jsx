import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, FileText, Activity } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8" />
            <h1 className="text-xl font-bold">AI Resume Matcher</h1>
            <span className="text-sm bg-blue-500 px-2 py-1 rounded">Hexaware</span>
          </div>
          
          <nav className="flex space-x-6">
            <Link
              to="/ar-requestor"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/ar-requestor'
                  ? 'bg-blue-500 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>AR Requestor</span>
            </Link>
            
            <Link
              to="/recruiter"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/recruiter'
                  ? 'bg-blue-500 text-white'
                  : 'text-blue-100 hover:bg-blue-500'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Recruiter</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;