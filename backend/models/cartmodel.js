import { Sequelize } from "sequelize";
import db from "../config/database.js";
import User from "./usermodel.js";
import Sparepart from "./sparepartmodel.js";

const { DataTypes } = Sequelize;

const Cart = db.define("cart", {
    id_user: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: "id"
        },
        allowNull: false
    },
    id_sparepart: {
        type: DataTypes.INTEGER,
        references: {
            model: Sparepart,
            key: "id"
        },
        allowNull: false
    },
    jumlah: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    status: {
        type: DataTypes.ENUM('cart', 'ordered', 'paid', 'cancelled'),
        defaultValue: 'cart',
        allowNull: false
    },
    total_harga: {
        type: DataTypes.INTEGER,
        allowNull: true // akan dihitung otomatis
    },
    tanggal_order: {
        type: DataTypes.DATE,
        allowNull: true
    },
    tanggal_bayar: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    freezeTableName: true,
    timestamps: true
});

// Relasi
Cart.belongsTo(User, { foreignKey: "id_user" });
Cart.belongsTo(Sparepart, { 
    foreignKey: "id_sparepart",
    onDelete: 'CASCADE'
});

// Hook untuk menghitung total harga sebelum save
Cart.beforeSave(async (cart, options) => {
    if (cart.id_sparepart && cart.jumlah) {
        const sparepart = await Sparepart.findByPk(cart.id_sparepart);
        if (sparepart) {
            cart.total_harga = sparepart.price * cart.jumlah;
        }
    }
});

export default Cart;