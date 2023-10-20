const mongoose = require("mongoose");


const modeloUsuarios =mongoose.model('usuarios', new mongoose.Schema({
    nombre: String,
    email:{
        type: String,
        unique: true,
    },
    password: String
}))

module.exports = modeloUsuarios;