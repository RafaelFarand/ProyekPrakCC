import { Sequelize } from "sequelize";
import db from "../config/database.js";
import User from "./usermodel.js";
import Sparepart from "./sparepartmodel.js";

const { DataTypes } = Sequelize;

const FormPembelian = db.define("form_pembelian", {
    id_user: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: "id"
        }
    },
    id_sparepart: {
        type: DataTypes.INTEGER,
        references: {
            model: Sparepart,
            key: "id"
        }
    },
    jumlah: DataTypes.INTEGER
}, {
    freezeTableName: true
});

// Relasi
FormPembelian.belongsTo(User, { foreignKey: "id_user" });
FormPembelian.belongsTo(Sparepart, { 
    foreignKey: "id_sparepart",
    onDelete: 'CASCADE' 
});

export default FormPembelian;