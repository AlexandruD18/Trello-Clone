const { Sequelize } = require('sequelize');

console.log("Tentativo di connessione al DB: 127.0.0.1:3307...");

const sequelize = new Sequelize(
  'trello',           
  'teamtrello',       
  'teamtrello123.',   
  {
    host: '127.0.0.1', 
    port: 3307,        
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