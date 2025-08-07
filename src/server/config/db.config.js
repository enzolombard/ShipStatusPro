module.exports = {
  HOST: "192.168.12.25",
  USER: "root",
  PASSWORD: "R00t4T5c3L$",
  DB: "ShipStatusPro",
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};