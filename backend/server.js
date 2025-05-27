import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import multer from "multer";
import db from "./config/database.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// CORS Configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://fe-040-dot-b-01-450713.uc.r.appspot.com'
        : 'http://127.0.0.1:5500',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400 // 24 hours
};

// Security Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Main Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Upload Directory Setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Static Files Serving with Cache Control
app.use("/uploads", express.static(uploadsDir, {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Multer Error Handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: false,
                message: 'File terlalu besar. Maksimal 5MB'
            });
        }
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
    next(error);
});

// API Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Main Routes
app.use('/api', router);

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const errorResponse = {
        status: false,
        message: 'Internal Server Error'
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.error = err.message;
        errorResponse.stack = err.stack;
    }

    res.status(err.status || 500).json(errorResponse);
});

// Database Connection
const connectDB = async () => {
    try {
        await db.authenticate();
        console.log("✅ Database connected successfully");
        
        await db.sync({ alter: true });
        console.log("✅ Database synchronized");
        
        return true;
    } catch (error) {
        console.error("⚠️ Database error:", error.message);
        return false;
    }
};

// Server Startup
const startServer = async () => {
    const dbConnected = await connectDB();
    
    if (!dbConnected && process.env.NODE_ENV === 'production') {
        console.error("Critical database connection failure in production");
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`
🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}
📁 Upload directory: ${uploadsDir}
🌐 CORS enabled for: ${corsOptions.origin}
        `);
    });
};

startServer().catch(console.error);

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    db.close().then(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});
