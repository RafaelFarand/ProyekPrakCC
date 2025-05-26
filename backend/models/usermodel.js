import { Sequelize } from "sequelize";
import db from "../config/database.js";

const { DataTypes } = Sequelize;

const User = db.define("User", {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: "customer",
    },
    refresh_token: {
        type: DataTypes.TEXT,
    },
}, {
    freezeTableName: true,
});

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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.log("❌ Invalid email format");
    return res.status(400).json({
        status: "Error",
        message: "Format email tidak valid"
    });
}

(async () => {
    try {
        await db.authenticate();
        console.log("✅ Database connected successfully");
        await db.sync({ alter: true });
        console.log("✅ Models synchronized");
    } catch (error) {
        console.error("❌ Database connection or sync failed:", error.message);
    }
})();

export default User;