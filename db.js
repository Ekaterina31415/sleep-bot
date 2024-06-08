require('dotenv').config();
const { Sequelize } = require('sequelize');

module.exports = new Sequelize(
  'kilina2012',
  'kilina2012',
  process.env.DB_PASS,
  {
    host: '77.222.36.10',
    port: 18590,
    dialect: 'postgres',
  },
);