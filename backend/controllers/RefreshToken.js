import jwt from "jsonwebtoken";
import User from "../models/usermodel.js";

export async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401); // Unauthorized: tidak ada cookie

    // Verifikasi refresh token
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) return res.sendStatus(403); // Forbidden: token rusak atau kedaluwarsa

        // Cari user berdasarkan ID hasil decoding token, BUKAN hanya dari token string-nya
        const user = await User.findOne({
          where: {
            id: decoded.id,
            refresh_token: refreshToken,
          },
        });

        if (!user) return res.sendStatus(403); // Token valid, tapi tidak ditemukan user

        // Buat access token baru
        const accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            username: user.username,
          },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "30m", // sesuaikan sesuai kebutuhan
          }
        );

        res.json({ accessToken });
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}