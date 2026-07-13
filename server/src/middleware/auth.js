// TODO: verify JWT from Authorization header and attach req.user
module.exports = function auth(req, res, next) {
  next();
};
