// TODO: format and log errors consistently
module.exports = function errorHandler(err, req, res, next) {
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};
