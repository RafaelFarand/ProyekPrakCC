import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Users = db.define('users', {
    name: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING,
        unique: true
    },
    password: {
        type: DataTypes.STRING
    },
    role: {
        type: DataTypes.ENUM('admin', 'customer'),
        defaultValue: 'customer'
    },
    refresh_token: {
        type: DataTypes.TEXT
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ]
});

export default Users;
