const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        avatar: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        // Cresce di uno a ogni "esci da tutti i dispositivi": i token vecchi smettono di valere.
        sessionVersion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'session_version',
        },
    },
    {
        tableName: 'users',
        // La password non esce mai dalle query normali, nemmeno dentro le include.
        // Solo il login usa lo scope 'withPassword'.
        defaultScope: { attributes: { exclude: ['password'] } },
        scopes: { withPassword: { attributes: { include: ['password'] } } },
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
        },
    }
);

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.sessionVersion;
    return values;
};

module.exports = User;
