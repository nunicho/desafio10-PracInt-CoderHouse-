const mongoose = require("mongoose");


const modeloUsuariosGithub =mongoose.model('usuarios', new mongoose.Schema({
    nombre: String,
    email:{
        type: String,
        unique: true,
    },
    password: String,
    github: {},
    rol: String
}))

module.exports = modeloUsuariosGithub;