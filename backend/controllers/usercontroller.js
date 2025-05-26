import User from '../models/usermodel.js'; // Import model User dari sequelize
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Email, username, dan password wajib diisi" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password harus memiliki minimal 6 karakter" });
    }

    // Cek email sudah ada
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 5);

    // Buat user baru
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role: "customer"
    });

    console.log("User berhasil dibuat:", newUser.id);

    res.status(201).json({ message: "User berhasil dibuat", userId: newUser.id });

  } catch (error) {
    console.error("❌ ERROR di register:", error);
    res.status(500).json({ 
        message: "Internal server error", 
        error: error.message, 
        stack: error.stack 
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

    const user = await User.findOne({ where: { email } });

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
      secure: false, // ubah true kalau di production HTTPS
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
      error: error.message,
      stack: error.stack
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
      error: error.message,
      stack: error.stack
    });
  }
}

export { login, logout, getUser, register };
