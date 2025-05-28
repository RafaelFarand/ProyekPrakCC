import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import multer from "multer";
import db from "./config/database.js";

// Import all models
import "./models/usermodel.js";
import "./models/sparepartmodel.js";
import "./models/modelpembelian.js";
import "./models/cartmodel.js"; // Import cart model baru

import router from "./routes/route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors({
    origin: 'https://fe-040-dot-b-01-450713.uc.r.appspot.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header("Access-Control-Allow-Origin", "https://fe-040-dot-b-01-450713.uc.r.appspot.com");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      res.header("Access-Control-Allow-Credentials", "true");
      return res.sendStatus(200);
    }
    next();
  });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routing
app.use(router);

// Serve folder uploads statis
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error handling middleware untuk multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File terlalu besar. Maksimal 5MB' });
        }
    }
    next(error);
});



// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Buat folder uploads jika belum ada
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Koneksi & Sinkronisasi database
(async () => {
    try {
        await db.authenticate();
        console.log("Database connected successfully");

        // Sync dengan alter untuk update schema existing tables
        await db.sync({ alter: true });
        console.log("All models synchronized successfully");
        
        console.log("Available tables:");
        console.log("- users");
        console.log("- spareparts");
        console.log("- form_pembelian (legacy)");
        console.log("- cart (new cart/order system)");
        
    } catch (error) {
        console.error("Database connection or sync failed:", error);
        process.exit(1);
    }
})();

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Uploads folder: ${uploadsDir}`);
    console.log("New Cart/Order endpoints available:");
    console.log("- GET /cart/:id_user - Get cart items");
    console.log("- POST /cart - Add to cart");
    console.log("- PUT /cart/:id - Update cart item");
    console.log("- DELETE /cart/:id - Remove from cart");
    console.log("- POST /cart/checkout - Checkout cart");
    console.log("- GET /orders/:id_user - Get user orders");
    console.log("- PUT /orders/:id/pay - Process payment");
    console.log("- PUT /orders/:id/cancel - Cancel order");
});