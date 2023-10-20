const express = require("express");
//const mongoose = require("mongoose");
const router = express.Router();
const modeloUsuarios = require("../dao/DB/models/usuariosGithub.modelo.js");
const modeloUsers = require("../dao/DB/models/usuariosGithub.modelo.js");
const crypto = require("crypto");

//PARA TRAER PASSPORT
const passport = require("passport");

router.get("/errorRegistro", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    error: "Error de registro",
    //AQUI SE PODRIA PONER UN REDIRECT
  });
});

router.post("/registro", async (req, res, next) => {
  let nombre = req.body.first_name;
  let apellido = req.body.last_name;
  let age = req.body.age;
  let email = req.body.email;
  let password = req.body.password;
  let existe = await modeloUsers.findOne({ email });


  if (!nombre || !apellido || !age || !email || !password) {
    return res.redirect("/registro?error=Faltan datos");
  }

  passport.authenticate("registro", async (error) => {
    if (error) {
      return res.redirect(
        "/registro?error=Ocurrió un error al registrar el usuario"
      );
    }   
    if (existe) {
      return res.redirect(
        "/registro?error=El correo electrónico ya está en uso"
      );
    }

    // Si no hay errores, se redirige a la página de inicio de sesión.
    res.redirect(`/login?usuarioCreado=${email}`);
  })(req, res, next);
});


router.get("/errorLogin", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    error: "Error Login",
  });
});

router.post("/login", (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return res.redirect("/login?error=Faltan datos");
  }

  passport.authenticate("loginLocal", (error, usuario, info) => {
    if (error) {
      return res.status(500).send("Error en la autenticación");
    }

    if (!usuario) {
      if (info === "Credenciales incorrectas") {
        console.log(info);
        return res.redirect("/login?error=Credenciales incorrectas");
      } else if (info === "Clave inválida") {
        console.log(info);
        return res.redirect("/login?error=Clave inválida");
      }
    }

    req.session.usuario = usuario;
    res.redirect("/");
  })(req, res, next);
});

router.get("/logout", (req, res) => {
  req.session.destroy((e) => console.log(e));
  res.redirect("/login?mensaje=Logout correcto!");

  // AGREGAR MENSAJE DE LOGOUT CORRECTO  CON FONDO AZUL
});

router.get(
  "/github",
  passport.authenticate("loginGithub", {
    successRedirect: "/",
    failureRedirect: "/api/sessions/errorGithub",
  }),
  (req, res) => {}
);

router.get(
  "/callbackGithub",
  passport.authenticate("loginGithub", {
    failureRedirect: "/api/sessions/errorGithub",
  }),
  (req, res) => {
    console.log(req.user);
    req.session.usuario = req.user;
    res.redirect("/");
  }
);

router.get("/errorGithub", (req, res) => {
  res.setHeader("Content-type", "application/json");
  res.status(200).json({
    error: "Error en github",
  });
});

// LOGIN DEL ADMINISTRADOR

router.post("/loginAdmin", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.redirect("/loginAdmin?error=Faltan datos");
  }

  if (email === "adminCoder@coder.com" && password === "adminCod3r123") {
    req.session.usuario = {
      nombre: "Coder",
      email: "adminCoder@coder.com",
      rol: "administrador",
    };
    // Se puso hardcodeado adminCoder@coder.com en el código de sessions.router.js porque no debía estar en la base de datos de usuarios.
    return res.redirect("/");
  } else {
    // Autenticación fallida
    return res.redirect("/loginAdmin?error=Credenciales incorrectas");
  }
});

module.exports = router;
