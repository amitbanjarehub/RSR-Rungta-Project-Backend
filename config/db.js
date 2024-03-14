const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
dotenv.config({ path: "../.env" });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
};

let pool;
const connectDB = async () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};
console.log("pool==>",pool);
module.exports = connectDB;
