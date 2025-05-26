import User from '../models/usermodel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Get all users
async function getUser(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'username']
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      status: "Error",
      message: error.message
    });
  }
}

// ✅ Register new user - FIXED version
async function register(req, res) {
  try {
    const { email, username, password } = req.body;

    console.log("📥 Data diterima:", req.body);

    // Validasi input
    if (!email || !username || !password) {
      return res.status(400).json({
        status: "Error",
        message: "Email, username, dan password wajib diisi"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "Error",
        message: "Password minimal 6 karakter"
      });
    }

    // Cek user sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        status: "Error",
        message: "Email sudah terdaftar"
      });
    }

    // Hash password
    const encryptPassword = await bcrypt.hash(password, 5);

    // Simpan user ke database
    console.log("📦 Menyimpan user baru...");
    const newUser = await User.create({
      email,
      username,
      password: encryptPassword,
      refresh_token: null,
      role: 'customer'
    });

    // Hapus password dari response
    const { password: _, ...userWithoutPassword } = newUser.toJSON();

    res.status(201).json({
      status: "Success",
      message: "Registrasi berhasil",
      data: userWithoutPassword
    });

  } catch (error) {
    console.error("❌ Error saat register:", error); // Log full error, bukan hanya .message
    res.status(500).json({
      status: "Error",
      message: "Gagal melakukan registrasi",
      error: error.message
    });
  }
}

// ✅ Login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (user) {
      const userPlain = user.toJSON();
      const { password: _, refresh_token: __, ...safeUserData } = userPlain;

      const decryptPassword = await bcrypt.compare(password, user.password);

      if (decryptPassword) {
        const accessToken = jwt.sign(safeUserData, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "30m",
        });

        const refreshToken = jwt.sign(safeUserData, process.env.REFRESH_TOKEN_SECRET, {
          expiresIn: "1d",
        });

        await User.update(
          { refresh_token: refreshToken },
          { where: { id: user.id } }
        );

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          sameSite: "Lax",
          secure: false,
        });

        res.status(200).json({
          status: "Success",
          message: "Login berhasil",
          safeUserData,
          accessToken,
        });
      } else {
        throw new Error("Password atau email salah");
      }
    } else {
      throw new Error("Password atau email salah");
    }
  } catch (error) {
    res.status(400).json({
      status: "Error",
      message: error.message,
    });
  }
}

// ✅ Logout
async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(204);

  const user = await User.findOne({ where: { refresh_token: refreshToken } });

  if (!user) return res.sendStatus(204);

  await User.update({ refresh_token: null }, { where: { id: user.id } });

  res.clearCookie("refreshToken");
  return res.sendStatus(200);
}

export { login, logout, getUser, register };
