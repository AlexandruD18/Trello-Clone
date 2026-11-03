require('dotenv').config();
const { Sequelize } = require('sequelize');

const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT) || 3307;

console.log(`Tentativo di connessione al DB: ${host}:${port}...`);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'trello',           
  process.env.DB_USER || 'teamtrello',       
  process.env.DB_PASSWORD,   
  {
    host, 
    port,        
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 10,
      min: 0,           // <--- Assicurati che qui ci sia la virgola!
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

module.exports = sequelize;