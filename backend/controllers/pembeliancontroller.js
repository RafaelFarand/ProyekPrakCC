import FormPembelian from "../models/modelpembelian.js";
import User from "../models/usermodel.js";
import Sparepart from "../models/sparepartmodel.js";

// GET all pembelian user
export async function getFormPembelian(req, res) {
    try {
        const pembelian = await FormPembelian.findAll({
            where: {
                id_user: req.params.id_user
            },
            include: [
                {
                    model: User,
                    attributes: ["email", "username"]
                },
                {
                    model: Sparepart,
                    attributes: ["name", "price", "stock", "image", "url"]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(pembelian);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// GET pembelian by id
export async function getFormPembelianById(req, res) {
    try {
        const pembelian = await FormPembelian.findOne({
            where: {
                id: req.params.id
            },
            include: [
                {
                    model: User,
                    attributes: ["email", "username"]
                },
                {
                    model: Sparepart,
                    attributes: ["name", "price", "stock", "image", "url"]
                }
            ]
        });
        if (!pembelian) {
            return res.status(404).json({ message: "Pembelian tidak ditemukan" });
        }
        res.status(200).json(pembelian);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// POST create new pembelian
export async function createFormPembelian(req, res) {
    try {
        const { id_user, id_sparepart, jumlah } = req.body;
        
        // Validation
        if (!id_user || !id_sparepart || !jumlah) {
            return res.status(400).json({ message: "Semua field harus diisi" });
        }

        // Check sparepart availability
        const sparepart = await Sparepart.findByPk(id_sparepart);
        if (!sparepart) {
            return res.status(404).json({ message: "Sparepart tidak ditemukan" });
        }
        
        if (sparepart.stock < jumlah) {
            return res.status(400).json({ message: "Stok tidak mencukupi" });
        }

        // Calculate total price
        const total_harga = sparepart.price * jumlah;
        
        // Create pembelian
        const newPembelian = await FormPembelian.create({
            id_user,
            id_sparepart,
            jumlah,
            total_harga,
            status: 'pending'
        });

        // Update stock
        sparepart.stock -= jumlah;
        await sparepart.save();
        
        res.status(201).json({ 
            message: "Pembelian berhasil dibuat",
            data: newPembelian
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// PUT update status pembelian (for payment processing)
export async function updateFormPembelian(req, res) {
    try {
        const { status } = req.body;
        const pembelian = await FormPembelian.findByPk(req.params.id);
        
        if (!pembelian) {
            return res.status(404).json({ message: "Pembelian tidak ditemukan" });
        }

        if (status === 'cancelled' && pembelian.status === 'pending') {
            // Return stock if order is cancelled
            const sparepart = await Sparepart.findByPk(pembelian.id_sparepart);
            sparepart.stock += pembelian.jumlah;
            await sparepart.save();
        }

        await FormPembelian.update({ status }, {
            where: {
                id: req.params.id
            }
        });

        res.status(200).json({ message: "Status pembelian berhasil diperbarui" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// DELETE pembelian (only for pending status)
export async function deleteFormPembelian(req, res) {
    try {
        const pembelian = await FormPembelian.findByPk(req.params.id);
        
        if (!pembelian) {
            return res.status(404).json({ message: "Pembelian tidak ditemukan" });
        }

        if (pembelian.status !== 'pending') {
            return res.status(400).json({ message: "Hanya pembelian dengan status pending yang dapat dihapus" });
        }

        // Return stock
        const sparepart = await Sparepart.findByPk(pembelian.id_sparepart);
        sparepart.stock += pembelian.jumlah;
        await sparepart.save();

        await FormPembelian.destroy({
            where: {
                id: req.params.id
            }
        });
        
        res.status(200).json({ message: "Pembelian berhasil dihapus" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}