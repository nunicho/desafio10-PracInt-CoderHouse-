
//PASSPORT
const passport = require("passport");

// PARA PASSPORT LOCAL
const local = require("passport-local");
const modeloUsuarios = require("../dao/DB/models/usuariosGithub.modelo.js");

//PARA PASSPORT GITHUB
const github = require("passport-github2");
const modeloUsuariosGithub = require("../dao/DB/models/usuariosGithub.modelo.js");

const crypto = require("crypto");
const util = require("../util.js");

const inicializaPassport = () => {
passport.use(
  "registro",
  new local.Strategy(
    {
      usernameField: "email",
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      try {
        let { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
          return done(null, false, "Por favor, complete todos los campos.");
        }

        let existe = await modeloUsuarios.findOne({ email });
        if (existe) {
          return done(null, false, "El correo electrónico ya está registrado");
        }

        let usuario = await modeloUsuarios.create({
          nombre,
          email,
          password: util.generaHash(password),
        });

        return done(null, usuario);
      } catch (error) {
        return done(error, false, "Ocurrió un error durante el registro.");
      }
    }
  )
);

  passport.use(
    "loginLocal",
    new local.Strategy(
      {
        usernameField: "email",
      },
      async (username, password, done) => {
        try {
          if (!username || !password) {
            return done(null, false, "Faltan datos");
          }

          let usuario = await modeloUsuarios.findOne({ email: username });
          if (!usuario) {
            return done(null, false, "Credenciales incorrectas");
          } else {
            if (!util.validaHash(usuario, password)) {
              return done(null, false, "Clave inválida");
            }
          }

          usuario = {
            nombre: usuario.nombre,
            email: usuario.email,
            _id: usuario._id,
            rol: "usuario",
          };

          return done(null, usuario);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.use(
    "loginGithub",
    new github.Strategy(
      {
        clientID: "Iv1.cc00dcea44bb45db",
        clientSecret: "f942dbbff3e0ead468ab3731ba8b0283a6d70057",
        callbackURL: "http://localhost:8080/api/sessions/callbackGithub",
      },
      async (token, tokenRefresh, profile, done) => {
        try {
          console.log(profile);
          let usuario = await modeloUsuariosGithub.findOne({
            email: profile._json.email,
          });
          if (!usuario) {
            usuario = await modeloUsuariosGithub.create({
              nombre: profile._json.name,
              email: profile._json.email,
              github: profile,
              rol: "usuario",
            });
          }

          done(null, usuario);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((usuario, done) => {
    return done(null, usuario._id);
  });

  passport.deserializeUser(async (id, done) => {
    let usuario = await modeloUsuariosGithub.findById(id);
    return done(null, usuario);
  });
}; // fin de inicializaPassport

module.exports = inicializaPassport;
