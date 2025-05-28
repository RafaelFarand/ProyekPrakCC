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
                    attributes: ["name", "price", "stock"]
                }
            ]
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
                    attributes: ["name", "price", "stock"]
                }
            ]
        });
        res.status(200).json(pembelian);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// POST create new pembelian
// Di createFormPembelian
export async function createFormPembelian(req, res) {
    try {
        const { id_sparepart, jumlah } = req.body;
        
        // Update stock
        const sparepart = await Sparepart.findByPk(id_sparepart);
        if (!sparepart) throw new Error('Sparepart tidak ditemukan');
        
        if (sparepart.stock < jumlah) throw new Error('Stok tidak cukup');
        
        sparepart.stock -= jumlah;
        await sparepart.save();
        
        await FormPembelian.create(req.body);
        res.status(201).json({ message: "Pembelian berhasil dibuat" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}


// PUT update pembelian
export async function updateFormPembelian(req, res) {
    try {
        await FormPembelian.update(req.body, {
            where: {
                id: req.params.id
            }
        });
        res.status(200).json({ message: "Pembelian berhasil diperbarui" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
}

// DELETE pembelian
export async function deleteFormPembelian(req, res) {
    try {
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
