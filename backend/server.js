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

// Buat folder uploads jika belum ada
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS Configuration - DIPERBAIKI
const corsOptions = {
    origin: [
        'https://fe-040-dot-b-01-450713.uc.r.appspot.com',
        'http://localhost:3000', // untuk development
        'http://localhost:5173', // untuk Vite
        'http://127.0.0.1:5500',  // untuk Live Server
        'http://localhost:8080', // untuk development tambahan
        'https://localhost:3000', // untuk HTTPS development
        'null' // untuk file:// protocol saat testing lokal
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods'
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200 // untuk support legacy browsers
};

// Middleware CORS - dipasang paling awal
app.use(cors(corsOptions));

// Handle preflight requests secara eksplisit untuk semua routes
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Access-Control-Allow-Methods');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Middleware tambahan untuk CORS debugging
app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`Request from origin: ${origin}, Method: ${req.method}, Path: ${req.path}`);
    
    // Set CORS headers untuk semua response
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    
    next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        cors: 'enabled'
    });
});

// Test CORS endpoint
app.get('/test-cors', (req, res) => {
    res.json({ 
        message: 'CORS test successful',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        headers: req.headers,
        method: req.method
    });
});

// Test endpoint tanpa auth
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server responding successfully',
        timestamp: new Date().toISOString()
    });
});

// Routing - pastikan router sudah dikonfigurasi dengan benar
app.use('/', router);

// Catch-all untuk routes yang tidak ditemukan
app.use('*', (req, res) => {
    console.log(`Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        message: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: [
            'GET /health',
            'GET /test-cors',
            'GET /test',
            'POST /register',
            'POST /login',
            'GET /logout',
            'GET /token',
            'GET /spareparts',
            'POST /spareparts',
            'PUT /spareparts/:id',
            'DELETE /spareparts/:id',
            'GET /cart/:id_user',
            'POST /cart',
            'PUT /cart/:id',
            'DELETE /cart/:id',
            'POST /cart/checkout',
            'GET /orders/:id_user',
            'PUT /orders/:id/pay',
            'PUT /orders/:id/cancel'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({ 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Koneksi & Sinkronisasi database
(async () => {
    try {
        await db.authenticate();
        console.log("✅ Database connected successfully");
        // Sync dengan alter untuk update schema existing tables
        await db.sync({ alter: true });
        console.log("✅ All models synchronized successfully");
        
        console.log("\n📊 Available tables:");
        console.log("- users");
        console.log("- spareparts");
        console.log("- form_pembelian (legacy)");
        console.log("- cart (new cart/order system)");
        
    } catch (error) {
        console.error("❌ Database connection or sync failed:", error);
        process.exit(1);
    }
})();

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📁 Uploads folder: ${uploadsDir}`);
    console.log("\n🌐 CORS configured for:");
    corsOptions.origin.forEach(url => console.log(`   - ${url}`));
    
    console.log("\n🛒 Cart/Order endpoints available:");
    console.log("   - GET /cart/:id_user - Get cart items");
    console.log("   - POST /cart - Add to cart");
    console.log("   - PUT /cart/:id - Update cart item");
    console.log("   - DELETE /cart/:id - Remove from cart");
    console.log("   - POST /cart/checkout - Checkout cart");
    console.log("   - GET /orders/:id_user - Get user orders");
    console.log("   - PUT /orders/:id/pay - Process payment");
    console.log("   - PUT /orders/:id/cancel - Cancel order");
    
    console.log("\n🔧 Test endpoints:");
    console.log("   - GET /health - Health check");
    console.log("   - GET /test-cors - CORS test");
    console.log("   - GET /test - Simple test");
    
    console.log(`\n✅ Server ready at: http://localhost:${PORT}`);
});
