import User from '../models/usermodel.js'; // Import model User dari sequelize
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
    console.log('=== Register request body ===', req.body);

    const { email, username, password } = req.body;

    // Validasi input
    if (!email || !username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "Email, username, dan password wajib diisi"
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        status: "Error", 
        message: "Email sudah terdaftar" 
      });
    }

    // Hash the password
    const encryptPassword = await bcrypt.hash(password, 5);

    // Create new user
    const newUser = await User.create({
      email,
      username,
      password: encryptPassword,
      refresh_token: null,
      role: 'customer' // Default role
    });

    // Return success but don't include password in response
    const { password: _, ...userWithoutPassword } = newUser.toJSON();

    res.status(201).json({
      status: "Success",
      message: "Registrasi berhasil",
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      status: "Error", 
      message: "Gagal registrasi",
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
