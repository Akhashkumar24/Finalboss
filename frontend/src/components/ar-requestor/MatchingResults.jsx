import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { User, Star, TrendingUp, Mail, CheckCircle, AlertTriangle } from 'lucide-react';

const MatchingResults = () => {
  const { state } = useAppContext();
  const { matchingResults } = state;

  if (!matchingResults.rankedProfiles || matchingResults.rankedProfiles?.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-500">
          Submit a job description to see matching results here.
        </p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-800">Matching Results Summary</h3>
          <span className="text-sm text-blue-600">
            {new Date(matchingResults.timestamp).toLocaleString()}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-800">{matchingResults.totalCandidates || 0}</p>
            <p className="text-sm text-blue-600">Total Candidates</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{matchingResults.topMatches?.length || 0}</p>
            <p className="text-sm text-blue-600">Top Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {matchingResults.topMatches?.[0]?.score || matchingResults.topMatches?.[0]?.matchScore || 0}%
            </p>
            <p className="text-sm text-blue-600">Best Match Score</p>
          </div>
        </div>

        {matchingResults.overallExplanation && (
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-gray-800 mb-2">AI Analysis Summary</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {matchingResults.overallExplanation}
            </p>
          </div>
        )}
      </div>

      {/* Top 3 Matches */}
      {matchingResults.topMatches && matchingResults.topMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Top 3 Recommended Candidates</h3>
            {state.workflowStatus.emailSent && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Email sent to AR requestor</span>
              </div>
            )}
          </div>

          {matchingResults.topMatches.slice(0, 3).map((match, index) => (
            <div key={match.profileId} className="bg-white border rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{match.profile.name}</h4>
                      <p className="text-blue-100">{match.profile.domain} • {match.profile.experience}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.score || match.matchScore)}`}>
                      <Star className="h-4 w-4 mr-1" />
                      {match.score || match.matchScore}% Match
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Contact Info */}
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{match.profile.email}</span>
                </div>

                {/* Skills */}
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {match.profile.skills.map((skill, skillIndex) => (
                      <span key={skillIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getScoreBarColor(match.score || match.matchScore)}`}
                          style={{ width: `${match.score || match.matchScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{match.score || match.matchScore}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Skills Match</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getScoreBarColor(match.skillsMatch)}`}
                          style={{ width: `${match.skillsMatch}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{match.skillsMatch}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Experience</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getScoreBarColor(match.experienceScore)}`}
                          style={{ width: `${match.experienceScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{match.experienceScore}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Context</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getScoreBarColor(match.contextualRelevance)}`}
                          style={{ width: `${match.contextualRelevance}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{match.contextualRelevance}%</span>
                    </div>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    AI Ranking Explanation
                  </h5>
                  <p className="text-sm text-gray-700 mb-3">{match.explanation || match.rankingExplanation}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {match.strengths && match.strengths.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-green-700 mb-1 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Strengths
                        </h6>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {match.strengths.map((strength, strengthIndex) => (
                            <li key={strengthIndex} className="flex items-start">
                              <span className="text-green-500 mr-1">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.gaps && match.gaps.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-yellow-700 mb-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Areas for Consideration
                        </h6>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {match.gaps.map((gap, gapIndex) => (
                            <li key={gapIndex} className="flex items-start">
                              <span className="text-yellow-500 mr-1">•</span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Candidates Table */}
      {matchingResults.rankedProfiles && matchingResults.rankedProfiles.length > 3 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-800">All Candidates Ranking</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills Match</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matchingResults.rankedProfiles.map((candidate, index) => (
                  <tr key={candidate.profileId} className={index < 3 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        index < 3 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        #{candidate.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{candidate.profile.name}</div>
                        <div className="text-sm text-gray-500">{candidate.profile.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.profile.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.profile.experience}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(candidate.score || candidate.matchScore)}`}>
                        {candidate.score || candidate.matchScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${getScoreBarColor(candidate.skillsMatch || 0)}`}
                            style={{ width: `${candidate.skillsMatch || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{candidate.skillsMatch || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingResults;