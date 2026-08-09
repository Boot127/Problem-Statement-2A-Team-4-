// Formats and logs errors consistently (Section 11). Must be mounted last.
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ message: err.message || 'Internal server error' });
};
