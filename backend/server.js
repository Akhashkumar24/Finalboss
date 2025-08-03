require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5001;

// Rate limiting - more permissive for polling endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for status polling endpoints and real-time data
    return req.path.includes('/status') || 
           req.path.includes('/health') || 
           req.path.includes('/realtime-stats') ||
           req.path.includes('/activity-logs');
  }
});

// Separate, more restrictive limiter for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit uploads to 10 per 15 minutes
  message: 'Too many upload requests. Please wait before uploading more files.',
});

// Middleware
app.use(compression());
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(generalLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes - Add debugging
console.log('Loading routes...');

try {
  const jobRoutes = require('./src/routes/process');
  const resumeRoutes = require('./src/routes/resumes');
  const agentRoutes = require('./src/routes/agents');
  const uploadRoutes = require('./src/routes/upload');
  
  // Import the new real-time routes
  const realtimeRoutes = require('./src/routes/realtime');
  
  console.log('✅ All routes loaded successfully');
  
  // Apply routes
  app.use('/api/jobs', jobRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/upload', uploadLimiter, uploadRoutes);
  
  // Add real-time routes - these will create endpoints like:
  // /api/agents/realtime-stats
  // /api/agents/system-health  
  // /api/agents/activity-logs
  app.use('/api/agents', realtimeRoutes);
  
  console.log('✅ All routes registered including real-time endpoints');
  
} catch (error) {
  console.error('❌ Error loading routes:', error);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL',
    version: '1.0.0'
  });
});

// Debug route to list all routes
app.get('/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const basePath = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/');
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ 
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    totalRoutes: routes.length,
    serverInfo: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Resume Matcher API - Real-time Agent Dashboard',
    version: '1.0.0',
    endpoints: {
      jobs: {
        'GET /api/jobs': 'Get all jobs',
        'GET /api/jobs/:id/status': 'Get job status',
        'POST /api/jobs/:id/process': 'Start job processing',
        'GET /api/jobs/:id/results': 'Get job results'
      },
      upload: {
        'POST /api/upload/resumes': 'Upload resume files',
        'GET /api/upload/status/:jobId': 'Get upload status'
      },
      agents: {
        'GET /api/agents/stats': 'Get agent statistics (legacy)',
        'GET /api/agents/realtime-stats': 'Get real-time agent statistics',
        'GET /api/agents/system-health': 'Get system health status',
        'GET /api/agents/activity-logs': 'Get recent activity logs'
      },
      resumes: {
        'GET /api/resumes/job/:jobId': 'Get resumes by job ID'
      },
      system: {
        'GET /health': 'Health check',
        'GET /debug/routes': 'List all routes'
      }
    },
    database: {
      type: 'PostgreSQL',
      name: process.env.DB_NAME || 'resume_matcher',
      host: process.env.DB_HOST || 'localhost'
    },
    realTimeFeatures: [
      'Live agent performance metrics',
      'Real-time job processing status',
      'Database table statistics',
      'Activity log streaming',
      'System health monitoring'
    ]
  });
});

// Import database
const { sequelize } = require('./src/config/database');

// Error handling middleware
const errorHandler = require('./src/middleware/errorHandler');
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      '/health',
      '/api',
      '/api/jobs',
      '/api/upload', 
      '/api/agents',
      '/api/agents/realtime-stats',
      '/api/agents/system-health',
      '/api/agents/activity-logs',
      '/api/resumes',
      '/debug/routes'
    ],
    suggestion: 'Visit /api for full API documentation'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized.');
    
    // Test database tables
    try {
      const [jobCount] = await sequelize.query('SELECT COUNT(*) as count FROM job_descriptions');
      const [resumeCount] = await sequelize.query('SELECT COUNT(*) as count FROM resumes');
      console.log(`📊 Database status: ${jobCount[0].count} jobs, ${resumeCount[0].count} resumes`);
    } catch (dbError) {
      console.warn('⚠️ Could not fetch database stats:', dbError.message);
    }
    
    const server = app.listen(PORT, () => {
      console.log('🚀 ===================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🐛 Debug Routes: http://localhost:${PORT}/debug/routes`);
      console.log(`📈 Real-time Stats: http://localhost:${PORT}/api/agents/realtime-stats`);
      console.log(`💚 System Health: http://localhost:${PORT}/api/agents/system-health`);
      console.log(`📜 Activity Logs: http://localhost:${PORT}/api/agents/activity-logs`);
      console.log('🚀 ===================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('HTTP server closed');
        sequelize.close().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('HTTP server closed');
        sequelize.close().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('❌ Please check your database connection and try again');
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
