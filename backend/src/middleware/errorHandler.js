const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    error.message = 'Validation Error';
    error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(error);
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    error.message = 'Duplicate entry found';
    error.details = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} must be unique`
    }));
    return res.status(409).json(error);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File size too large';
    return res.status(413).json(error);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error.message = 'Too many files';
    return res.status(413).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    return res.status(401).json(error);
  }

  // Database connection errors
  if (err.name === 'SequelizeConnectionError') {
    error.message = 'Database connection failed';
    return res.status(503).json(error);
  }

  // Custom application errors
  if (err.status) {
    return res.status(err.status).json(error);
  }

  // Default to 500 server error
  res.status(500).json(error);
};

module.exports = errorHandler;