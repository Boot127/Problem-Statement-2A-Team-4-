// TODO: validate request body/params against a schema
module.exports = function validate(schema) {
  return (req, res, next) => {
    next();
  };
};
