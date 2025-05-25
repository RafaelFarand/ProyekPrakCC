import Cart from "../models/cartmodel.js";
import User from "../models/usermodel.js";
import Sparepart from "../models/sparepartmodel.js";
import { Op } from "sequelize";

// GET cart items untuk user tertentu
export async function getCartItems(req, res) {
    try {
        const { id_user } = req.params;
        
        const cartItems = await Cart.findAll({
            where: {
                id_user: id_user,
                status: 'cart'
            },
            include: [
                {
                    model: User,
                    attributes: ["email", "username"]
                },
                {
                    model: Sparepart,
                    attributes: ["name", "price", "stock", "image"]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: "Success",
            message: "Cart items retrieved successfully",
            data: cartItems
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// POST add item to cart
export async function addToCart(req, res) {
    try {
        const { id_user, id_sparepart, jumlah } = req.body;
        
        // Validasi input
        if (!id_user || !id_sparepart || !jumlah) {
            return res.status(400).json({
                status: "Error",
                message: "id_user, id_sparepart, dan jumlah wajib diisi"
            });
        }

        // Cek stok sparepart
        const sparepart = await Sparepart.findByPk(id_sparepart);
        if (!sparepart) {
            return res.status(404).json({
                status: "Error",
                message: "Sparepart tidak ditemukan"
            });
        }

        if (sparepart.stock < jumlah) {
            return res.status(400).json({
                status: "Error",
                message: "Stok tidak mencukupi"
            });
        }

        // Cek apakah item sudah ada di cart
        const existingCartItem = await Cart.findOne({
            where: {
                id_user: id_user,
                id_sparepart: id_sparepart,
                status: 'cart'
            }
        });

        if (existingCartItem) {
            // Update jumlah jika item sudah ada
            const newJumlah = existingCartItem.jumlah + parseInt(jumlah);
            
            if (sparepart.stock < newJumlah) {
                return res.status(400).json({
                    status: "Error",
                    message: "Stok tidak mencukupi untuk jumlah total"
                });
            }

            existingCartItem.jumlah = newJumlah;
            await existingCartItem.save();

            res.status(200).json({
                status: "Success",
                message: "Item berhasil diupdate di cart",
                data: existingCartItem
            });
        } else {
            // Tambah item baru ke cart
            const cartItem = await Cart.create({
                id_user,
                id_sparepart,
                jumlah: parseInt(jumlah),
                status: 'cart'
            });

            res.status(201).json({
                status: "Success",
                message: "Item berhasil ditambahkan ke cart",
                data: cartItem
            });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// PUT update cart item (hanya untuk status cart)
export async function updateCartItem(req, res) {
    try {
        const { id } = req.params;
        const { jumlah } = req.body;

        const cartItem = await Cart.findByPk(id);
        if (!cartItem) {
            return res.status(404).json({
                status: "Error",
                message: "Item cart tidak ditemukan"
            });
        }

        // Hanya bisa update jika status masih cart
        if (cartItem.status !== 'cart') {
            return res.status(400).json({
                status: "Error",
                message: "Tidak dapat mengubah item yang sudah dipesan atau dibayar"
            });
        }

        // Validasi stok jika jumlah diubah
        if (jumlah) {
            const sparepart = await Sparepart.findByPk(cartItem.id_sparepart);
            if (sparepart.stock < jumlah) {
                return res.status(400).json({
                    status: "Error",
                    message: "Stok tidak mencukupi"
                });
            }
            cartItem.jumlah = parseInt(jumlah);
        }

        await cartItem.save();

        res.status(200).json({
            status: "Success",
            message: "Item cart berhasil diupdate",
            data: cartItem
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// DELETE remove item from cart (hanya untuk status cart)
export async function removeFromCart(req, res) {
    try {
        const { id } = req.params;

        const cartItem = await Cart.findByPk(id);
        if (!cartItem) {
            return res.status(404).json({
                status: "Error",
                message: "Item cart tidak ditemukan"
            });
        }

        // Hanya bisa hapus jika status masih cart
        if (cartItem.status !== 'cart') {
            return res.status(400).json({
                status: "Error",
                message: "Tidak dapat menghapus item yang sudah dipesan atau dibayar"
            });
        }

        await cartItem.destroy();

        res.status(200).json({
            status: "Success",
            message: "Item berhasil dihapus dari cart"
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// POST checkout - mengubah status dari cart ke ordered
export async function checkout(req, res) {
    try {
        const { id_user } = req.body;

        // Ambil semua item cart untuk user
        const cartItems = await Cart.findAll({
            where: {
                id_user: id_user,
                status: 'cart'
            },
            include: [
                {
                    model: Sparepart,
                    attributes: ["name", "price", "stock"]
                }
            ]
        });

        if (cartItems.length === 0) {
            return res.status(400).json({
                status: "Error",
                message: "Cart kosong"
            });
        }

        // Validasi stok untuk semua item
        for (let item of cartItems) {
            if (item.sparepart.stock < item.jumlah) {
                return res.status(400).json({
                    status: "Error",
                    message: `Stok ${item.sparepart.name} tidak mencukupi`
                });
            }
        }

        // Update semua item cart menjadi ordered dan kurangi stok
        for (let item of cartItems) {
            // Update status cart
            item.status = 'ordered';
            item.tanggal_order = new Date();
            await item.save();

            // Kurangi stok sparepart
            const sparepart = await Sparepart.findByPk(item.id_sparepart);
            sparepart.stock -= item.jumlah;
            await sparepart.save();
        }

        res.status(200).json({
            status: "Success",
            message: "Checkout berhasil",
            data: cartItems
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// GET orders - ambil pesanan user (status ordered, paid, cancelled)
export async function getOrders(req, res) {
    try {
        const { id_user } = req.params;
        const { status } = req.query; // optional filter by status

        let whereCondition = {
            id_user: id_user,
            status: {
                [Op.in]: ['ordered', 'paid', 'cancelled']
            }
        };

        if (status && ['ordered', 'paid', 'cancelled'].includes(status)) {
            whereCondition.status = status;
        }

        const orders = await Cart.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    attributes: ["email", "username"]
                },
                {
                    model: Sparepart,
                    attributes: ["name", "price", "stock", "image"]
                }
            ],
            order: [['tanggal_order', 'DESC']]
        });

        res.status(200).json({
            status: "Success",
            message: "Orders retrieved successfully",
            data: orders
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// PUT payment - update status dari ordered ke paid
export async function processPayment(req, res) {
    try {
        const { id } = req.params;

        const order = await Cart.findByPk(id);
        if (!order) {
            return res.status(404).json({
                status: "Error",
                message: "Order tidak ditemukan"
            });
        }

        if (order.status !== 'ordered') {
            return res.status(400).json({
                status: "Error",
                message: "Order tidak dalam status yang dapat dibayar"
            });
        }

        order.status = 'paid';
        order.tanggal_bayar = new Date();
        await order.save();

        res.status(200).json({
            status: "Success",
            message: "Pembayaran berhasil diproses",
            data: order
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}

// PUT cancel order - update status dari ordered ke cancelled (kembalikan stok)
export async function cancelOrder(req, res) {
    try {
        const { id } = req.params;

        const order = await Cart.findByPk(id);
        if (!order) {
            return res.status(404).json({
                status: "Error",
                message: "Order tidak ditemukan"
            });
        }

        if (order.status !== 'ordered') {
            return res.status(400).json({
                status: "Error",
                message: "Hanya order dengan status 'ordered' yang dapat dibatalkan"
            });
        }

        // Kembalikan stok
        const sparepart = await Sparepart.findByPk(order.id_sparepart);
        sparepart.stock += order.jumlah;
        await sparepart.save();

        // Update status order
        order.status = 'cancelled';
        await order.save();

        res.status(200).json({
            status: "Success",
            message: "Order berhasil dibatalkan dan stok dikembalikan",
            data: order
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ 
            status: "Error",
            message: error.message 
        });
    }
}