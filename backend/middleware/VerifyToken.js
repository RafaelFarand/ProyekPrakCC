import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if(!token) {
            const refreshToken = req.cookies.refreshToken;
            if(!refreshToken) {
                return res.status(401).json({
                    status: false,
                    message: "Silakan login terlebih dahulu"
                });
            }
            // Verify refresh token and generate new access token
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
                if(err) return res.status(403).json({ message: "Invalid refresh token" });
                const accessToken = jwt.sign(
                    { userId: decoded.userId, role: decoded.role },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '15s' }
                );
                req.userId = decoded.userId;
                req.role = decoded.role;
                res.setHeader('Authorization', `Bearer ${accessToken}`);
                next();
            });
        } else {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if(err) return res.status(403).json({ message: "Invalid access token" });
                req.userId = decoded.userId;
                req.role = decoded.role;
                next();
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Error verifying token",
            error: error.message
        });
    }
}

export const verifyAdmin = (req, res, next) => {
    if(req.role !== 'admin') {
        return res.status(403).json({
            status: false,
            message: "Akses ditolak. Hanya admin yang diizinkan."
        });
    }
    next();
}