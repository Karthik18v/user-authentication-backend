const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send("User created successfully");
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_CODE");
      response.json({ jwtToken: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  console.log(oldPassword, newPassword);
  const selectedUser = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectedUser);
  console.log(dbUser);
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  console.log(isPasswordMatched);

  if (isPasswordMatched === true) {
    if (newPassword.length < 5) {
      response.send("Password too short");
      response.status(400);
    } else {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(hashedPassword);
      const updateUser = `
        UPDATE
        user
        SET
        password = '${hashedPassword}'
        WHERE
        username = '${username}';`;
      await db.run(updateUser);
      response.send("Update Successful");
    }
  } else {
    response.send("Invalid current password");
    response.status(400);
  }
});

module.exports = app;
