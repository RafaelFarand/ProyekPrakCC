import User from "../models/usermodel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Get all users
async function getUser(req, res) {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "username"],
    });
    res.status(200).json(users);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
}

// Register new user
async function register(req, res) {
  try {
    const { email, username, password } = req.body;

    const existingUser = await User.findOne({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: "Error",
        message: "Email already registered",
      });
    }

    const encryptPassword = await bcrypt.hash(password, 5);

    const newUser = await User.create({
      email,
      username,
      password: encryptPassword,
      role: "customer",
    });

    const { password: _, ...userWithoutPassword } = newUser.toJSON();

    res.status(201).json({
      status: "Success",
      message: "Registration successful",
      data: userWithoutPassword,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: {
        email: email,
      },
    });

    if (user) {
      const userPlain = user.toJSON();
      const { password: _, ...safeUserData } = userPlain;

      const decryptPassword = await bcrypt.compare(password, user.password);

      if (decryptPassword) {
        const accessToken = jwt.sign(
          safeUserData,
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "30m",
          }
        );

        res.status(200).json({
          status: "Succes",
          message: "Login Berhasil",
          safeUserData,
          accessToken,
        });
      } else {
        const error = new Error("Password atau email salah");
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error("Password atau email salah");
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({
      status: "Error",
      message: error.message,
    });
  }
}

async function logout(req, res) {
  // Tidak perlu hapus refresh token, cukup kirim status sukses
  return res.sendStatus(200);
}

export { login, logout, getUser, register };
