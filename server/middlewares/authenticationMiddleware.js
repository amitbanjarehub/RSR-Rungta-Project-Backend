const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
require("dotenv").config({ path: "../../.env" });

const authenticationMiddleware = (req, res, next) => {
  try {

    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userIds = decodedToken.userIds;
    next();
  } catch (error) {
    console.log("Error authenticating user:", error);
    throw new ApiError(401, "Unauthorized");
  }
};

module.exports = authenticationMiddleware;
