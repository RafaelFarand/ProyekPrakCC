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

// CORS Configuration
const corsOptions = {
  origin: "https://fe-040-dot-b-01-450713.uc.r.appspot.com", // tambahkan domain frontend
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["set-cookie"],
};

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Buat folder uploads jika belum ada
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve folder statis
app.use("/uploads", express.static(uploadsDir));

// Middleware error handler untuk multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ message: "File terlalu besar. Maksimal 5MB" });
  }
  next(error);
});

// Health check endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/test-cors", (req, res) => {
  res.json({
    message: "CORS test successful",
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
  });
});

app.get("/test", (req, res) => {
  res.json({
    message: "Server responding successfully",
    timestamp: new Date().toISOString(),
  });
});

// Routing utama
app.use("/", router);

// Catch-all untuk route yang tidak ditemukan
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Koneksi & Sinkronisasi database (tidak exit jika error)
(async () => {
  try {
    await db.authenticate();
    console.log("✅ Database connected successfully");
    await db.sync({ alter: true });
    console.log("✅ Models synchronized");
  } catch (error) {
    console.error("⚠️ Database connection or sync failed:", error.message);
    // Jangan process.exit(1), agar Cloud Run tetap bisa jalan
  }
})();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);
  console.log("📦 Available endpoints:");
  console.log("- GET /health");
  console.log("- GET /test");
  console.log("- GET /test-cors");
  console.log("- GET /spareparts");
  console.log("- POST /cart");
  console.log("- POST /cart/checkout");
  console.log("- GET /orders/:id_user");
  console.log("- PUT /orders/:id/pay");
  console.log("- PUT /orders/:id/cancel");
});
