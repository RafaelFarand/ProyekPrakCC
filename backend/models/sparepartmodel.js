import { Sequelize } from "sequelize";
import db from "../config/database.js";

const { DataTypes } = Sequelize;

const Sparepart = db.define("sparepart", {
    name: DataTypes.STRING,
    stock: DataTypes.INTEGER,
    price: DataTypes.INTEGER,
    image: DataTypes.STRING, // nama file gambar
}, {
    freezeTableName: true
});

export default Sparepart;