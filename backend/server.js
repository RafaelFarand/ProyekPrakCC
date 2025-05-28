import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import multer from "multer";
import db from "./config/database.js";

// Import models
import "./models/usermodel.js";
import "./models/sparepartmodel.js";
import "./models/modelpembelian.js";
import "./models/cartmodel.js";

import router from "./routes/route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads folder if missing
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ✅ CORS configuration
const corsOptions = {
    origin: "https://fe-040-dot-b-01-450713.uc.r.appspot.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

// ✅ Apply CORS middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// ✅ Core middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ✅ Static file serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Multer error handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File terlalu besar. Maksimal 5MB' });
    }
    next(error);
});

// ✅ Routes
app.use(router);

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ✅ DB connection & sync
(async () => {
    try {
        await db.authenticate();
        console.log("Database connected successfully");
        await db.sync({ alter: true });
        console.log("All models synchronized successfully");
    } catch (error) {
        console.error("Database connection or sync failed:", error);
        process.exit(1);
    }
})();

// ✅ Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Uploads folder: ${uploadsDir}`);
});
