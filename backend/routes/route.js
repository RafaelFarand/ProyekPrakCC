import express from 'express';
 import upload from "../middleware/upload.js";
 

 import { login, register, logout } from '../controllers/usercontroller.js';
 import { verifyToken } from '../middleware/VerifyToken.js';
 import { refreshToken } from '../controllers/RefreshToken.js';
 

 import { getSpareparts, createSparepart, updateSparepart, deleteSparepart } from "../controllers/sparepartcontroller.js";
 

 import { 
  getFormPembelian, // Diubah dari getFormPembelian
  getFormPembelianById, 
  createFormPembelian, 
  updateFormPembelian, 
  deleteFormPembelian 
 } from "../controllers/pembeliancontroller.js";
 

 import { 
  getCartItems, // Seragamkan nama fungsi
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  checkout, 
  getOrders, 
  processPayment, 
  cancelOrder 
 } from "../controllers/cartcontroller.js";
 

 const router = express.Router();
 

 // --- SPAREPART ROUTES ---
 router.get("/spareparts", verifyToken, getSpareparts);
 router.post("/spareparts", verifyToken, upload.single("image"), createSparepart);
 router.put("/spareparts/:id", verifyToken, upload.single("image"), updateSparepart);
 router.delete("/spareparts/:id", verifyToken, deleteSparepart);
 

 // --- CART ROUTES ---
 router.get("/cart/:id_user", verifyToken, getCartItems);
 router.post("/cart", verifyToken, addToCart);
 router.put("/cart/:id", verifyToken, updateCartItem); // Tambah verifyToken
 router.delete("/cart/:id", verifyToken, removeFromCart); // Tambah verifyToken
 router.post("/cart/checkout", verifyToken, checkout);
 

 // --- ORDER ROUTES ---
 router.get("/orders/:id_user", verifyToken, getOrders);
 router.put("/orders/:id/pay", verifyToken, processPayment);
 router.put("/orders/:id/cancel", verifyToken, cancelOrder);
 

 // --- LEGACY PEMBELIAN ROUTES (Backward Compatibility) ---
 router.get("/pembelian/:id_user", verifyToken, getFormPembelian); // Diubah
 router.get("/pembelian/detail/:id", verifyToken, getFormPembelianById); // Diubah
 router.post("/pembelian", verifyToken, createFormPembelian); // Diubah
 router.put("/pembelian/:id", verifyToken, updateFormPembelian); // Diubah
 router.delete("/pembelian/:id", verifyToken, deleteFormPembelian); // Diubah
 

 // --- USER AUTH ROUTES ---
 router.post("/register", register);
 router.post("/login", login);
 router.get("/logout", logout);
 router.get("/token", refreshToken);
 

 export default router;