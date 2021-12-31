const { Pool } = require("pg");

const dbPool = new Pool({
  //object
  host: "ec2-54-161-238-249.compute-1.amazonaws.com",
  database: "dvnbgmk0idi2h",
  port: "5432",
  user: "suyrfirkiuerik",
  password: "9cc2a2917be55d37c561c2ad999d4f63be82aac3655fccf1625b95fb927a183a",
  dialect: "postgres",
});

module.exports = dbPool;
