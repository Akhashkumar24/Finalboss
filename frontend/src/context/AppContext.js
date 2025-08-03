import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext();

const initialState = {
  currentJD: null,
  matchingResults: {},
  workflowStatus: {
    jdCompared: false,
    profilesRanked: false,
    emailSent: false
  },
  agentStats: {
    comparisonAgent: { status: 'idle', queue: 0, latency: 0, errors: 0 },
    rankingAgent: { status: 'idle', queue: 0, latency: 0, errors: 0 },
    communicationAgent: { status: 'idle', queue: 0, latency: 0, errors: 0 }
  },
  notifications: [],
  isProcessing: false
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_JD':
      return {
        ...state,
        currentJD: action.payload,
        workflowStatus: { jdCompared: false, profilesRanked: false, emailSent: false }
      };
    
    
    case 'UPDATE_WORKFLOW_STATUS':
      return {
        ...state,
        workflowStatus: { ...state.workflowStatus, ...action.payload }
      };
    
    case 'SET_MATCHING_RESULTS':
      return {
        ...state,
        matchingResults: action.payload,
        workflowStatus: { ...state.workflowStatus, profilesRanked: true }
      };
    
    case 'UPDATE_AGENT_STATS':
      return {
        ...state,
        agentStats: {
          ...state.agentStats,
          [action.payload.agent]: {
            ...state.agentStats[action.payload.agent],
            ...action.payload.stats
          }
        }
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          { id: uuidv4(), timestamp: new Date(), ...action.payload }
        ]
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);


  const value = {
    state,
    dispatch
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}