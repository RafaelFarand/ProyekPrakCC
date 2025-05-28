import Sparepart from "../models/sparepartmodel.js";
import FormPembelian from "../models/modelpembelian.js"; // TAMBAHKAN INI
import fs from 'fs';
import path from 'path';

// GET all
export async function getSpareparts(req, res) {
    try {
        const data = await Sparepart.findAll();
        res.json(data);
    } catch (err) {
        console.error("Get Spareparts Error:", err);
        res.status(500).json({ message: err.message });
    }
}

// POST with image
export async function createSparepart(req, res) {
    try {
        const { name, stock, price } = req.body;
        
        // Validasi input
        if (!name || !stock || !price) {
            return res.status(400).json({ message: "Semua field wajib diisi" });
        }

        // Validasi file upload
        if (!req.file) {
            return res.status(400).json({ message: "Gambar wajib diupload" });
        }

        const image = req.file.filename;

        // Validasi ekstensi file
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            // Hapus file yang sudah diupload
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: "Format gambar tidak valid. Gunakan JPG, JPEG, PNG, atau GIF" });
        }

        const sparepart = await Sparepart.create({
            name,
            stock: parseInt(stock),
            price: parseInt(price),
            image
        });

        res.status(201).json({
            message: "Sparepart berhasil ditambahkan",
            data: sparepart
        });
    } catch (err) {
        console.error("Create Sparepart Error:", err);
        
        // Hapus file jika ada error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ message: "Gagal menambahkan sparepart: " + err.message });
    }
}

// PUT
export async function updateSparepart(req, res) {
    try {
        const spare = await Sparepart.findByPk(req.params.id);
        if (!spare) {
            // Hapus file baru jika sparepart tidak ditemukan
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: "Sparepart tidak ditemukan" });
        }

        const { name, stock, price } = req.body;

        if (!name || !stock || !price) {
            // Hapus file baru jika validasi gagal
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: "Semua field wajib diisi" });
        }

        // Jika ada file baru yang diupload
        if (req.file) {
            // Hapus gambar lama jika ada
            if (spare.image) {
                const oldImagePath = path.join('./uploads', spare.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            spare.image = req.file.filename;
        }

        spare.name = name;
        spare.stock = parseInt(stock);
        spare.price = parseInt(price);

        await spare.save();
        res.json({
            message: "Sparepart berhasil diperbarui",
            data: spare
        });
    } catch (err) {
        console.error("Update Sparepart Error:", err);
        
        // Hapus file baru jika ada error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ message: "Gagal memperbarui sparepart: " + err.message });
    }
}

// DELETE (PERBAIKAN)
export async function deleteSparepart(req, res) {
    try {
        const { id } = req.params;
        const spare = await Sparepart.findByPk(id);
        
        if (!spare) {
            return res.status(404).json({ message: "Sparepart tidak ditemukan" });
        }

        // Hapus semua relasi pembelian terlebih dahulu
        await FormPembelian.destroy({
            where: { id_sparepart: id }
        });

        // Hapus file gambar jika ada
        if (spare.image) {
            const imagePath = path.join('./uploads', spare.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Hapus sparepart
        await spare.destroy();
        
        res.json({ 
            message: "Sparepart berhasil dihapus",
            deletedId: id 
        });
    } catch (err) {
        console.error("Delete Sparepart Error:", err);
        res.status(500).json({ message: "Gagal menghapus sparepart: " + err.message });
    }
}

