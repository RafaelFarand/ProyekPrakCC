import User from '../models/usermodel.js'; // Import model User dari sequelize
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/database.js'; // ADD THIS LINE - Import your database connection

// Database connection and synchronization
(async () => {
    try {
        await db.authenticate();
        console.log("✅ Database connected successfully");
        await db.sync({ alter: true }); // Sinkronisasi model dengan database
        console.log("✅ Models synchronized");
    } catch (error) {
        console.error("❌ Database connection or sync failed:", error.message);
    }
})();

// Get all users
async function getUser(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'username'] // Exclude sensitive fields
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ GetUser error:', error);
    res.status(500).json({ 
      status: "Error", 
      message: error.message 
    });
  }
}

// Register new user
async function register(req, res) {
  try {
    console.log("===== REGISTER START =====");
    console.log("Request Body:", req.body);

    const { email, username, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        status: "Error",
        message: "Email, username, dan password wajib diisi" 
      });
    }

    if (password.length < 6) {
      console.log("❌ Password too short");
      return res.status(400).json({ 
        status: "Error",
        message: "Password harus memiliki minimal 6 karakter" 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format");
      return res.status(400).json({ 
        status: "Error",
        message: "Format email tidak valid" 
      });
    }

    console.log("✅ Validation passed, checking existing user...");

    // Cek email sudah ada
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log("❌ Email already exists");
      return res.status(400).json({ 
        status: "Error",
        message: "Email sudah terdaftar" 
      });
    }

    console.log("✅ Email available, hashing password...");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // Increased salt rounds for better security

    console.log("✅ Password hashed, creating user...");

    // Buat user baru
    const newUser = await User.create({
      email: email.toLowerCase().trim(), // Normalize email
      username: username.trim(),
      password: hashedPassword,
      role: "customer"
    });

    console.log("✅ User berhasil dibuat:", newUser.id);

    res.status(201).json({ 
      status: "Success",
      message: "User berhasil dibuat", 
      userId: newUser.id 
    });

  } catch (error) {
    console.error("❌ ERROR di register:", error);
    
    // Handle specific Sequelize errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status: "Error",
        message: "Data tidak valid",
        details: error.errors.map(err => err.message)
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        status: "Error",
        message: "Email atau username sudah digunakan"
      });
    }

    res.status(500).json({ 
        status: "Error",
        message: "Internal server error", 
        error: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "Error",
        message: "Email dan password wajib diisi"
      });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      return res.status(400).json({
        status: "Error",
        message: "Email atau password salah"
      });
    }

    const userPlain = user.toJSON();
    const { password: _, refresh_token: __, ...safeUserData } = userPlain;

    const decryptPassword = await bcrypt.compare(password, user.password);
    if (!decryptPassword) {
      return res.status(400).json({
        status: "Error",
        message: "Email atau password salah"
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(safeUserData, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });
    const refreshToken = jwt.sign(safeUserData, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' });

    // Update refresh token in DB
    await User.update({ refresh_token: refreshToken }, { where: { id: user.id } });

    // Set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production', // Dynamic based on environment
    });

    res.status(200).json({
      status: "Success",
      message: "Login berhasil",
      user: safeUserData,
      accessToken,
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: "Error",
      message: "Gagal login",
      error: error.message
    });
  }
}

async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(204);

    const user = await User.findOne({ where: { refresh_token: refreshToken } });
    if (!user) return res.sendStatus(204);

    await User.update({ refresh_token: null }, { where: { id: user.id } });

    res.clearCookie('refreshToken');
    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      status: "Error",
      message: "Gagal logout",
      error: error.message
    });
  }
}

export { login, logout, getUser, register };