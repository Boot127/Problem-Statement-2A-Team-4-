// TODO: enforce role-based access control per Section 4 of the HLD
module.exports = function authorize(...roles) {
  return (req, res, next) => {
    next();
  };
};
