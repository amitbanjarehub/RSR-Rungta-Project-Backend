const errorMiddleware = (err, req, res, next) => {
  const { statusCode, message, errors, success, data } = err;

  return res.status(statusCode).json({
    statusCode,
    message,
    errors,
    success,
    data,
  });
};

module.exports = errorMiddleware;
