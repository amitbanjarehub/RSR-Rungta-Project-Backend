require("dotenv").config({ path: "../../.env" });

const connectDB = require("../../config/db");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const jwt = require("jsonwebtoken");
const { error } = require("console");

function generateAccessToken(user) {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "3600s",
  });
}

const login = asyncHandler(async (req, res, next) => {
  const { phone, password } = req.body;
  const db = await connectDB();
  const user = await db.query(
    `select * from tblstud_profile where stud_mobile="${phone}"`
  );

  const md5Password = crypto.createHash("md5").update(password).digest("hex");

  if (user[0][0]?.stud_password !== md5Password) {
    throw new ApiError(401, "Invalid password");
  }

  const allUserIds = [];
  user[0]?.forEach((user) => {
    allUserIds.push(user.id.toString());
  });

  const accessToken = generateAccessToken({
    phone: phone,
    userIds: allUserIds,
  });

  if (!accessToken) {
    throw new ApiError(500);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { access_token: accessToken, token_type: "Bearer" })
    );
});

const getUserGroup = asyncHandler(async (req, res, next) => {
  let userGroup = [];
  const db = await connectDB();
  await Promise.all(
    req.userIds.map(async (id) => {
      const user = await db.query(
        `SELECT id,stud_name,stud_mobile,stud_roll_no FROM tblstud_profile WHERE id=${id} order by id asc `
      );

      if (user[0][0]) userGroup.push(user[0][0]);
    })
  );

  if (userGroup.length < 1) {
    throw new ApiError(404, "no user found");
  }

  return res.status(200).json(new ApiResponse(200, userGroup));
});

module.exports = {
  login,
  getUserGroup,
};
