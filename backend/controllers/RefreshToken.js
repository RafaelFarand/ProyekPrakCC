import jwt from "jsonwebtoken";
import User from "../models/usermodel.js";

export async function refreshToken(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    const user = await User.findOne({
      where: { refresh_token: refreshToken },
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
    res.status(500).json({ message: error.message });
  }
}
