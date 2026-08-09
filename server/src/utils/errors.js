// Shared error types. `status` is read by middleware/errorHandler.js, which
// formats the response, so services can just throw and let it map the code.

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

module.exports = { ValidationError, NotFoundError };
