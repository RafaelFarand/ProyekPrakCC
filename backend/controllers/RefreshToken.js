import jwt from "jsonwebtoken";
import User from "../models/usermodel.js";

export async function refreshToken(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verifikasi token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }

    // Cek user di DB dan cocokan refresh_token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        refresh_token: token,
      },
    });

    if (!user) return res.sendStatus(403);

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);

      const { id, email, username } = user;
      const accessToken = jwt.sign(
        { id, email, username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30m" }
      );

      res.json({ accessToken });
    });
  } catch (error) {
    console.error("Refresh token handler error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", detail: error.message });
  }
}