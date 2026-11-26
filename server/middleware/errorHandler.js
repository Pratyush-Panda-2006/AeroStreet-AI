// ============================================
// AeroStreet-AI — Centralized Error Handling & AppError Class
// ============================================

/**
 * Custom application error class representing operational HTTP errors.
 * @extends Error
 */
export class AppError extends Error {
  /**
   * Create an application error.
   * @param {string} message - Human-readable error description
   * @param {number} [statusCode=400] - HTTP status code
   * @param {string} [code='INVALID_REQUEST'] - Machine-readable error code string
   */
  constructor(message, statusCode = 400, code = 'INVALID_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Express error-handling middleware.
 * Formats all errors into a consistent contract:
 * { success: false, error: string, details: { code, message, statusCode } }
 *
 * @param {Error|AppError} err - Error object thrown in handler
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  const statusCode =
    err.statusCode || (err.status ? Number(err.status) : err.name === 'MulterError' ? 400 : 500);
  const code = err.code || (statusCode >= 500 ? 'SERVER_ERROR' : 'INVALID_REQUEST');
  const message = err.message || 'An unexpected error occurred';

  // Multer limit handling
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds maximum permitted limit (5 MB).',
      details: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum permitted limit (5 MB).',
        statusCode: 400,
      },
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    details: {
      code,
      message,
      statusCode,
    },
  });
}
