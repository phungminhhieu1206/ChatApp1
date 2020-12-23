const Joi = require("@hapi/joi");

const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.validate(req.body);
    if (result.error) {
      return res.status(400).json(result.error);
    } else {
      next();
    }
  };
};

const schemas = {
  userSchema: Joi.object().keys({
    name: Joi.string().max(15).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
};

module.exports = {
  validateBody,
  schemas,
};
