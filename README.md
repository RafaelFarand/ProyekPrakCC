#  REST API Documentation

## Authentication Routes

| Method | Endpoint      | Auth     | Description             |
|--------|---------------|----------|-------------------------|
| POST   | `/register`   | ❌       | Register new user       |
| POST   | `/login`      | ❌       | Login user              |
| GET    | `/logout`     | ✅       | Logout current user     |
| GET    | `/token`      | ✅       | Refresh access token    |

---

## Sparepart Routes

| Method | Endpoint             | Auth | Description              |
|--------|----------------------|------|--------------------------|
| GET    | `/spareparts`        | ✅    | Get all spareparts       |
| POST   | `/spareparts`        | ✅    | Add new sparepart (with image) |
| PUT    | `/spareparts/:id`    | ✅    | Update sparepart by ID   |
| DELETE | `/spareparts/:id`    | ✅    | Delete sparepart by ID   |

> 📷 Upload image with key: `image` using `multipart/form-data`

---

## Cart Routes

| Method | Endpoint               | Auth | Description           |
|--------|------------------------|------|-----------------------|
| GET    | `/cart/:id_user`       | ✅    | Get user's cart       |
| POST   | `/cart`                | ✅    | Add item to cart      |
| PUT    | `/cart/:id`            | ✅    | Update item in cart   |
| DELETE | `/cart/:id`            | ✅    | Remove item from cart |
| POST   | `/cart/checkout`       | ✅    | Checkout the cart     |

---

## Order Routes

| Method | Endpoint               | Auth | Description           |
|--------|------------------------|------|-----------------------|
| GET    | `/orders/:id_user`     | ✅    | Get user orders       |
| PUT    | `/orders/:id/pay`      | ✅    | Mark order as paid    |
| PUT    | `/orders/:id/cancel`   | ✅    | Cancel an order       |

---

##  Pembelian Routes (Legacy)

| Method | Endpoint                    | Auth | Description                    |
|--------|-----------------------------|------|--------------------------------|
| GET    | `/pembelian/:id_user`       | ✅    | Get user's purchase forms      |
| GET    | `/pembelian/detail/:id`     | ✅    | Get purchase detail by ID      |
| POST   | `/pembelian`                | ✅    | Create new purchase form       |
| PUT    | `/pembelian/:id`            | ✅    | Update purchase form by ID     |
| DELETE | `/pembelian/:id`            | ✅    | Delete purchase form by ID     |


---

## ⚙️ Utility Routes

| Method | Endpoint       | Description              |
|--------|----------------|--------------------------|
| GET    | `/health`      | Health check             |
| GET    | `/test-cors`   | Test CORS headers        |
| GET    | `/test`        | Simple API response test |
