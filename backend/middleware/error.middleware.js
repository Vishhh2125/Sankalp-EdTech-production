import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  
  // Log error with full details
  console.error(
    `[${timestamp}] ${method} ${path}:`,
    {
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack,
    }
  );

  logger.error(`[${timestamp}] ${method} ${path} - Error:`, {
    message: err.message,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Check if it's an ApiError instance
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      new ApiResponse(
        err.statusCode,
        process.env.NODE_ENV === 'development' ? { error: err.message, details: err } : null,
        err.message
      )
    );
  }

  // 1. Validation Error (old system)
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      new ApiResponse(400, null, 'Validation failed')
    );
  }

  // 2. Custom AppError (old system)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      new ApiResponse(err.statusCode, null, err.message)
    );
  }

  // 3. Prisma Errors (old system)
  if (err.code === 'P2002') {
    return res.status(409).json(
      new ApiResponse(409, null, 'Record already exists')
    );
  }

  if (err.code === 'P2025') {
    return res.status(404).json(
      new ApiResponse(404, null, 'Record not found')
    );
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      new ApiResponse(401, null, 'Invalid token')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      new ApiResponse(401, null, 'Token expired')
    );
  }

  // 5. Default (main system)
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  const errorResponse = {
    statusCode,
    message,
  };

  // In development, include error details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }

  return res.status(statusCode).json(
    new ApiResponse(statusCode, errorResponse, message)
  );
};

export { AppError, errorHandler };