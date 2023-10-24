const Router = require("express").Router;
const router = Router();
const arrayProducts = require("../archivos/productos.json");
const productosModelo = require("../dao/DB/models/productos.modelo.js");
const carritosModelo = require("../dao/DB/models/carritos.modelo.js");
const prodModelo = require("../dao/DB/models/productos.modelo.js");
const mongoose = require("mongoose");

const auth = (req, res, next) => {
  if (req.session.usuario) {
    next();
  } else {
    return res.redirect("/login");
  }
};

const auth2 = (req, res, next) => {
  if (req.session.usuario) {
    return res.redirect("/");
  } else {
    next();
  }
};

router.use((req, res, next) => {
  res.locals.usuario = req.session.usuario; // Pasar el usuario a res.locals
  next();
});

router.get("/", auth, (req, res) => {
  let verLogin = true;
  if (req.session.usuario) {
    verLogin = false;
  }

  res.status(200).render("home", {
    verLogin,
    titlePage: "Home Page de la ferretería El Tornillo",
    estilo: "styles.css",
  });
});

//---------------------------------------------------------------- RUTAS EN FILESYSTEM --------------- //

router.get("/fsproducts", auth, (req, res) => {
  let index = parseInt(req.query.index) || 0;
  const array = arrayProducts;
  const totalProducts = array.length;

  const lastIndex = array.length - 1;

  if (index < 0) {
    index = lastIndex;
  } else if (index >= totalProducts) {
    index = 0;
  }

  const product = array[index];

  res.header("Content-type", "text/html");
  res.status(200).render("FSproducts", {
    product: product,
    index: index,
    titlePage: "Página de productos",
    estilo: "productsStyles.css",
  });
});

router.get("/fsrealtimeproducts", auth, (req, res) => {
  let index = parseInt(req.query.index) || 0;
  const array = arrayProducts;
  const totalProducts = array.length;

  const lastIndex = array.length - 1;

  if (index < 0) {
    index = lastIndex;
  } else if (index >= totalProducts) {
    index = 0;
  }

  const product = array[index];

  res.header("Content-type", "text/html");
  res.status(200).render("realTimeProducts", {
    product: product,
    index: index,
    titlePage: "Página de productos en tiempo real",
    estilo: "realTimeProducts.css",
  });
});

//---------------------------------------------------------------- RUTAS PARA MONGO --------------- //

router.get("/DBproducts", auth, async (req, res) => {
  try {
    let pagina = req.query.pagina || 1;
    let filtroTitle = req.query.filtro;
    let filtroCode = req.query.codeFilter;
    let sortOption = req.query.sort; // Obtén el valor del campo "sort" de la consulta
    let limit = parseInt(req.query.limit) || 10; // Obtén el valor del parámetro "limit" de la consulta, o establece un valor predeterminado de 10

    let query = {};

    if (filtroTitle && filtroCode) {
      query = {
        $or: [
          { title: { $regex: filtroTitle, $options: "i" } },
          { code: { $regex: filtroCode, $options: "i" } },
        ],
      };
    } else if (filtroTitle) {
      query = { title: { $regex: filtroTitle, $options: "i" } };
    } else if (filtroCode) {
      query = { code: { $regex: filtroCode, $options: "i" } };
    }

    let sortQuery = {}; // Inicializa el objeto de consulta de ordenamiento vacío

    if (sortOption === "price_asc") {
      // Si el usuario selecciona orden ascendente por precio
      sortQuery = { price: 1 };
    } else if (sortOption === "price_desc") {
      // Si el usuario selecciona orden descendente por precio
      sortQuery = { price: -1 };
    }

    let productos = await productosModelo.paginate(query, {
      limit: limit, // Aplica el límite según el valor de "limit"
      lean: true,
      page: pagina,
      sort: sortQuery, // Aplica el ordenamiento según el valor de sortQuery
    });

    let { totalPages, hasPrevPage, hasNextPage, prevPage, nextPage } =
      productos;

    res.header("Content-type", "text/html");
    res.status(200).render("DBproducts", {
      productos: productos.docs,
      hasProducts: productos.docs.length > 0,
      //activeProduct: true,
      status: productos.docs.status,
      pageTitle: "Productos en DATABASE",
      estilo: "productsStyles.css",
      totalPages,
      hasPrevPage,
      hasNextPage,
      prevPage,
      nextPage,
      filtro: filtroTitle || "",
      codeFilter: filtroCode || "",
      sort: sortOption || "", // Establece el valor del campo de ordenamiento en la vista
      limit: limit, // Pasa el límite a la vista
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;

router.get("/DBproducts/:id", auth, async (req, res) => {
  let id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ error: "id inválido" });

  let productoDB = await productosModelo.findById(id).lean();

  if (!productoDB)
    return res.status(404).json({ error: `Producto con id ${id} inexistente` });

  res.header("Content-type", "text/html");
  res.status(200).render("DBproductsDetails", {
    productoDB,
    estilo: "productDetails.css",
    // title: productoDB.title,
    // description: productoDB.description,
    // price: productoDB.price,
    // thumbnail: productoDB.thumbnail ,
    // code: productoDB.code,
    // stock: productoDB.stock,
    // estilo: "realTimeProducts.css"
  });
});

router.post("/DBProducts", auth, async (req, res) => {
  let producto = req.body;
  if (
    !producto.title ||
    !producto.description ||
    !producto.price ||
    !producto.thumbnail ||
    !producto.code ||
    !producto.stock
  )
    return res.status(400).json({ error: "Faltan datos" });

  let existe = await productosModelo.findOne({ code: producto.code });
  if (existe)
    return res.status(400).json({
      error: `El código ${producto.code} ya está siendo usado por otro producto.`,
    });

  try {
    let productoInsertado = await productosModelo.create(producto);
    res.status(201).json({ productoInsertado });
  } catch (error) {
    res.status(500).json({ error: "Error inesperado", detalle: error.message });
  }
});

router.delete("/DBproducts/:id", auth, async (req, res) => {
  let id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ error: "id inválido" });

  let existe = await productosModelo.findById(id);

  if (!existe)
    return res.status(404).json({ error: `Producto con id ${id} inexistente` });
  let resultado = await productosModelo.deleteOne({ _id: id });

  res.status(200).json({ resultado });
});

router.get("/carts/:cid", auth, async (req, res) => {
  try {
    const cid = req.params.cid;

    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(400).json({
        status: "error",
        mensaje: 'Requiere un argumento "cid" de tipo ObjectId válido',
      });
    }

    const carrito = await carritosModelo
      .findOne({ _id: cid })
      .populate({
        path: "productos.producto",
        model: prodModelo,
      })
      .lean();

    if (!carrito) {
      return res.status(404).json({
        status: "error",
        mensaje: `El carrito con ID ${cid} no existe`,
      });
    }

    res.header("Content-type", "text/html");
    res.status(200).render("DBcartDetails", {
      estilo: "DBcartDetails.css",
      carritoDB: carrito,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//---------------------------------------------------------------- RUTAS PARA EL CHAT --------------- //

router.get("/chat", auth, (req, res) => {
  res.setHeader("Content-type", "text/html");
  res.status(200).render("chat", {
    estilo: "chat.css",
    usuario: req.session.usuario,
  });
});

//---------------------------------------------------------------- RUTAS PARA EL LOGIN ---------------//

router.get("/registro", auth2, (req, res) => {
  let error = false;
  let errorDetalle = "";
  if (req.query.error) {
    error = true;
    errorDetalle = req.query.error;
  }

  res.status(200).render("registro", {
    verLogin: true,
    error,
    errorDetalle,
    estilo: "login.css",
  });
});

router.get("/login", auth2, (req, res) => {
  let error = false;
  let errorDetalle = "";
  if (req.query.error) {
    error = true;
    errorDetalle = req.query.error;
  }

  let usuarioCreado = false;
  let usuarioCreadoDetalle = "";
  if (req.query.usuarioCreado) {
    usuarioCreado = true;
    usuarioCreadoDetalle = req.query.usuarioCreado;
  }

  res.status(200).render("login", {
    verLogin: true,
    usuarioCreado,
    usuarioCreadoDetalle,
    error,
    errorDetalle,
    estilo: "login.css",
  });
});

router.get("/perfil", auth, (req, res) => {
  res.status(200).render("perfil", {
    verLogin: false,
    estilo: "login.css",
  });
});

router.get("/loginAdmin", (req, res) => {
  let error = false;
  let errorDetalle = "";
  if (req.query.error) {
    error = true;
    errorDetalle = req.query.error;
  }

  res.status(200).render("loginAdmin", {
    error,
    errorDetalle,
    estilo: "login.css",
  });
});

//  RUTA CURRENT

router.get("/current", (req, res) => {
 
  const user = req.session.usuario; 

  if (!user) {
    return res.status(401).render("current", {
      estilo: "login.css",
    });
  }

  res.status(200).render("current", {
    estilo: "login.css",
    usuario: user, 
  });
});



module.exports = router;
