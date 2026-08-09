// Validates req.body against a plain-object field schema. Kept dependency-
// free (no Joi/Yup on the server) since the rule set here is small; Formik +
// Yup remain the primary validation UX on the client (NFR-3), this is the
// server-side backstop required by NFR-1 ("all inputs validated").
//
// Schema shape: { fieldName: { required, type, enum, maxLength, min } }
function validateField(name, rules, value) {
  const errors = [];
  const present = value !== undefined && value !== null && value !== '';

  if (rules.required && !present) {
    errors.push(`${name} is required`);
    return errors;
  }
  if (!present) return errors;

  if (rules.type === 'string' && typeof value !== 'string') {
    errors.push(`${name} must be a string`);
  }
  if (rules.type === 'number' && typeof value !== 'number' && Number.isNaN(Number(value))) {
    errors.push(`${name} must be a number`);
  }
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    errors.push(`${name} must be at most ${rules.maxLength} characters`);
  }
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${name} must be one of: ${rules.enum.join(', ')}`);
  }
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    errors.push(`${name} is not in a valid format`);
  }
  return errors;
}

module.exports = function validate(schema) {
  return (req, res, next) => {
    const errors = Object.entries(schema).flatMap(([name, rules]) => validateField(name, rules, req.body[name]));
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    return next();
  };
};
