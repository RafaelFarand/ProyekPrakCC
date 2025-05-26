# 🛠️ REST API Documentation

This project is a Node.js Express backend that handles user authentication, sparepart management, cart and order functionality, as well as file uploads. It supports token-based authentication and CORS for frontend communication.

---

## 🔗 Base URL

```
http://localhost:5000/
```

---

## 🔐 Authentication Routes

| Method | Endpoint      | Auth     | Description             |
|--------|---------------|----------|-------------------------|
| POST   | `/register`   | ❌       | Register new user       |
| POST   | `/login`      | ❌       | Login user              |
| GET    | `/logout`     | ✅       | Logout current user     |
| GET    | `/token`      | ✅       | Refresh access token    |

---

## 🧾 Sparepart Routes

| Method | Endpoint             | Auth | Description              |
|--------|----------------------|------|--------------------------|
| GET    | `/spareparts`        | ✅    | Get all spareparts       |
| POST   | `/spareparts`        | ✅    | Add new sparepart (with image) |
| PUT    | `/spareparts/:id`    | ✅    | Update sparepart by ID   |
| DELETE | `/spareparts/:id`    | ✅    | Delete sparepart by ID   |

> 📷 Upload image with key: `image` using `multipart/form-data`

---

## 🛒 Cart Routes

| Method | Endpoint               | Auth | Description           |
|--------|------------------------|------|-----------------------|
| GET    | `/cart/:id_user`       | ✅    | Get user's cart       |
| POST   | `/cart`                | ✅    | Add item to cart      |
| PUT    | `/cart/:id`            | ✅    | Update item in cart   |
| DELETE | `/cart/:id`            | ✅    | Remove item from cart |
| POST   | `/cart/checkout`       | ✅    | Checkout the cart     |

---

## 📦 Order Routes

| Method | Endpoint               | Auth | Description           |
|--------|------------------------|------|-----------------------|
| GET    | `/orders/:id_user`     | ✅    | Get user orders       |
| PUT    | `/orders/:id/pay`      | ✅    | Mark order as paid    |
| PUT    | `/orders/:id/cancel`   | ✅    | Cancel an order       |

---

## 📋 Pembelian Routes (Legacy)

| Method | Endpoint                    | Auth | Description                    |
|--------|-----------------------------|------|--------------------------------|
| GET    | `/pembelian/:id_user`       | ✅    | Get user's purchase forms      |
| GET    | `/pembelian/detail/:id`     | ✅    | Get purchase detail by ID      |
| POST   | `/pembelian`                | ✅    | Create new purchase form       |
| PUT    | `/pembelian/:id`            | ✅    | Update purchase form by ID     |
| DELETE | `/pembelian/:id`            | ✅    | Delete purchase form by ID     |

---

## 📂 File Upload

- Folder: `/uploads`
- URL Example: `http://localhost:5000/uploads/filename.jpg`
- Max Size: 5MB
- Allowed via `multipart/form-data`

---

## ⚙️ Utility Routes

| Method | Endpoint       | Description              |
|--------|----------------|--------------------------|
| GET    | `/health`      | Health check             |
| GET    | `/test-cors`   | Test CORS headers        |
| GET    | `/test`        | Simple API response test |

---

## 🌍 CORS Configuration

The server accepts requests from:

- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5500`
- `http://localhost:8080`
- `https://localhost:3000`
- `https://fe-040-dot-b-01-450713.uc.r.appspot.com`
- `null` (e.g. `file://` testing)

---

## 📦 Tech Stack

- Node.js
- Express
- Sequelize
- Multer (for file uploads)
- JSON Web Token (JWT)
- CORS & Cookie-parser
