/**
 * Enhanced Error Handling Utilities
 * 
 * Provides consistent error handling patterns across the application
 * with structured error types, logging, and user-friendly messaging.
 */

import { type APICallError } from "ai";
import { isString, isObject } from "radash";
import { toast } from "sonner";

// Define standard error types for consistent handling
export enum ErrorType {
  API = "api_error",
  NETWORK = "network_error",
  AUTH = "auth_error",
  RATE_LIMIT = "rate_limit_error",
  VALIDATION = "validation_error",
  UI = "ui_error",
  UNKNOWN = "unknown_error"
}

// Define error severity levels
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

// Interface for structured error information
export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  originalError?: Error | unknown;
  context?: Record<string, unknown>;
  timestamp: number;
  code?: string | number;
  userFriendlyMessage: string;
}

// Class for application-specific errors
export class JournalistError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  originalError?: Error | unknown;
  context?: Record<string, unknown>;
  timestamp: number;
  code?: string | number;
  userFriendlyMessage: string;

  constructor(options: Omit<AppError, 'timestamp'>) {
    super(options.message);
    this.name = 'JournalistError';
    this.type = options.type;
    this.severity = options.severity;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = Date.now();
    this.code = options.code;
    this.userFriendlyMessage = options.userFriendlyMessage;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JournalistError);
    }
  }
}

// Error logging function
export function logError(error: AppError | JournalistError | Error | unknown): void {
  if (error instanceof JournalistError) {
    // Log structured JournalistError
    console.error(`[${error.type}][${error.severity}] ${error.message}`, {
      type: error.type,
      message: error.message,
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp,
      code: error.code,
      originalError: error.originalError
    });
  } else if ((error as AppError)?.type) {
    // Log structured AppError
    const appError = error as AppError;
    console.error(`[${appError.type}][${appError.severity}] ${appError.message}`, {
      type: appError.type,
      message: appError.message,
      severity: appError.severity,
      context: appError.context,
      timestamp: appError.timestamp,
      code: appError.code,
      originalError: appError.originalError
    });
  } else if (error instanceof Error) {
    // Log standard Error
    console.error(`[${ErrorType.UNKNOWN}][${ErrorSeverity.ERROR}] ${error.message}`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } else {
    // Log unknown error type
    console.error(`[${ErrorType.UNKNOWN}][${ErrorSeverity.ERROR}] Unknown error:`, error);
  }
}

// User-friendly error notification with appropriate UI feedback
export function notifyError(error: AppError | JournalistError | Error | unknown): void {
  // Always log the error first
  logError(error);
  
  // Determine user-friendly message and severity
  let message: string;
  let severity: ErrorSeverity;
  
  if (error instanceof JournalistError) {
    message = error.userFriendlyMessage;
    severity = error.severity;
  } else if ((error as AppError)?.userFriendlyMessage) {
    message = (error as AppError).userFriendlyMessage;
    severity = (error as AppError).severity;
  } else if (error instanceof Error) {
    message = getDefaultUserMessageForError(error);
    severity = ErrorSeverity.ERROR;
  } else {
    message = "An unexpected error occurred. Please try again.";
    severity = ErrorSeverity.ERROR;
  }
  
  // Display appropriate toast notification based on severity
  switch (severity) {
    case ErrorSeverity.INFO:
      toast.info(message);
      break;
    case ErrorSeverity.WARNING:
      toast.warning(message);
      break;
    case ErrorSeverity.CRITICAL:
      toast.error(message, { duration: 5000 });
      break;
    case ErrorSeverity.ERROR:
    default:
      toast.error(message);
      break;
  }
}

// Create an API-specific error handler
export function handleApiError(
  error: unknown, 
  defaultMessage = "An error occurred while communicating with the API."
): JournalistError {
  if (error instanceof Response || (error as any)?.status) {
    // Handle fetch Response errors
    const response = error as Response;
    const status = response.status;
    
    // Handle common HTTP status codes
    let message: string;
    let type = ErrorType.API;
    let severity = ErrorSeverity.ERROR;
    
    switch (status) {
      case 401:
        message = "Authentication error. Please check your API key.";
        type = ErrorType.AUTH;
        break;
      case 403:
        message = "You don't have permission to access this resource.";
        type = ErrorType.AUTH;
        break;
      case 404:
        message = "The requested resource could not be found.";
        severity = ErrorSeverity.WARNING;
        break;
      case 429:
        message = "Rate limit exceeded. Please try again later.";
        type = ErrorType.RATE_LIMIT;
        severity = ErrorSeverity.WARNING;
        break;
      case 500:
        message = "A server error occurred. Please try again later.";
        severity = ErrorSeverity.ERROR;
        break;
      default:
        message = `API error: ${response.statusText || status}`;
    }
    
    return new JournalistError({
      type,
      message: `API error (${status}): ${response.statusText || status}`,
      severity,
      originalError: error,
      context: { status, statusText: response.statusText },
      code: status,
      userFriendlyMessage: message
    });
  }
  
  if (error instanceof Error) {
    // Handle standard Error objects
    const isNetworkError = error.message.includes('network') || 
                           error.message.toLowerCase().includes('fetch') ||
                           error.message.toLowerCase().includes('connection');
    
    return new JournalistError({
      type: isNetworkError ? ErrorType.NETWORK : ErrorType.API,
      message: `API error: ${error.message}`,
      severity: ErrorSeverity.ERROR,
      originalError: error,
      context: { stack: error.stack },
      userFriendlyMessage: isNetworkError 
        ? "Network error. Please check your internet connection and try again."
        : defaultMessage
    });
  }
  
  // Handle unknown error types
  return new JournalistError({
    type: ErrorType.API,
    message: `Unrecognized API error: ${JSON.stringify(error)}`,
    severity: ErrorSeverity.ERROR,
    originalError: error,
    userFriendlyMessage: defaultMessage
  });
}

// Helper function to get user-friendly messages from standard errors
function getDefaultUserMessageForError(error: Error): string {
  const message = error.message.toLowerCase();
  
  // Network related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
    return "Authentication error. Please check your credentials or permissions.";
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return "The request timed out. Please try again later.";
  }
  
  // Validation errors
  if (message.includes('valid') || message.includes('required') || message.includes('missing')) {
    return "There was an issue with the data provided. Please check your inputs and try again.";
  }
  
  // Default fallback message
  return "An unexpected error occurred. Please try again.";
}


// Function to format error message for API response
export function formatErrorResponse(error: unknown): { message: string; code?: number | string; details?: unknown } {
  if (error instanceof JournalistError) {
    return {
      message: error.userFriendlyMessage,
      code: error.code,
      details: {
        type: error.type,
        severity: error.severity,
        originalMessage: error.message
      }
    };
  }
  
  if (error instanceof Error) {
    return {
      message: getDefaultUserMessageForError(error),
      details: { originalMessage: error.message }
    };
  }
  
  return {
    message: "An unexpected error occurred",
    details: error
  };
}

// Export consistent error messages for reuse
export const ErrorMessages = {
  NETWORK_ERROR: "Network error. Please check your internet connection and try again.",
  API_ERROR: "An error occurred while communicating with the API.",
  AUTH_ERROR: "Authentication error. Please check your API key.",
  RATE_LIMIT_ERROR: "Rate limit exceeded. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again."
};

// Parse error utility
interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export function parseError(error: unknown): string {
  if (!error) return "Unknown error occurred";
  
  // Check if error is a Response object
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Handle Axios-style errors
    if (err.response) {
      const status = err.response.status;
      const message = err.response.data?.error?.message || err.response.statusText || "Unknown error";
      return `Error ${status}: ${message}`;
    }
    
    // Handle standard error objects
    if (err.message) {
      return err.message;
    }
    
    // Handle error.toString() if it has a reasonable implementation
    try {
      const stringified = err.toString();
      if (stringified !== '[object Object]') {
        return stringified;
      }
    } catch (e) {
      // Ignore toString errors
    }
    
    // For unknown object errors, try to stringify
    try {
      return JSON.stringify(err);
    } catch (e) {
      // Circular structure or other JSON errors
    }
  }
  
  return "Unknown error occurred";
}
