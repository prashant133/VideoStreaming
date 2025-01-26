// Define a custom error class by extending the built-in Error class
class ApiError extends Error {
  // Constructor to initialize the custom error properties
  constructor(
    statusCode, // The HTTP status code representing the error (e.g., 404, 500)
    message = "something went wrong", // Default error message
    errors = [], // Additional error details, defaulting to an empty array
    stack = "" // Optional custom stack trace, defaulting to an empty string
  ) {
    // Call the parent class constructor with the message to initialize it
    super(message);

    // Set the HTTP status code for the error
    this.statusCode = statusCode;

    // Placeholder for additional data related to the error, initialized as null
    this.data = null;

    // Set the error message to the provided message or default
    this.message = message;

    // Indicate that the operation failed, defaulting to false
    this.success = false;

    // Store any additional error details provided
    this.errors = errors;

    // If a custom stack trace is provided, set it
    if (stack) {
      this.stack = stack;
    } else {
      // Otherwise, generate a standard stack trace, excluding this constructor
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Export the ApiError class for use in other files
export { ApiError };
