require('dotenv').config();
const { Sequelize } = require('sequelize');

const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT) || 3307;

const sequelize = new Sequelize(
    process.env.DB_NAME || 'trello',
    process.env.DB_USER || 'teamtrello',
    process.env.DB_PASSWORD,
    {
        host,
        port,
        dialect: 'mysql',
        // Le query SQL finiscono nel log solo se richiesto esplicitamente.
        logging: process.env.DB_LOGGING === 'true' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        define: {
            timestamps: true,
            underscored: true,
        },
    }
);

module.exports = sequelize;
