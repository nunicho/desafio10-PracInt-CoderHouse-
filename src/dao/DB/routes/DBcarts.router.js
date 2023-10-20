const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const carritosModelo = require("../models/carritos.modelo.js"); 
const Producto = require("../models/productos.modelo.js"); 
const path = require("path");
const prodModelo = require("../models/productos.modelo.js");


//------------------------------------------------------------------------ PETICION GET

router.get("/", async (req, res) => {
  try {
    const carritos = await carritosModelo.find(); 

    res.status(200).json({ data: carritos });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

//------------------------------------------------------------------------ PETICION GET con /:ID

router.get("/:cid", async (req, res) => {
  try {
    const cid = req.params.cid;

    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(400).json({
        status: "error",
        mensaje: 'Requiere un argumento "cid" de tipo ObjectId válido',
      });
    }

    const carrito = await carritosModelo.findOne({ _id: cid }).populate({
      path: "productos.producto",
      model: prodModelo,
    });

    if (!carrito) {
      return res.status(404).json({
        status: "error",
        mensaje: `El carrito con ID ${cid} no existe`,
      });
    }


    const productosEnCarrito = carrito.productos.map((productoEnCarrito) => ({
      producto: {
        ...productoEnCarrito.producto._doc,
      },
      quantity: productoEnCarrito.cantidad, 
    }));

    res
      .status(200)
      .json({
        data: { carrito: { _id: carrito._id, productos: productosEnCarrito } },
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});








   
//------------------------------------------------------------------------ PETICION POST

router.post("/", async (req, res) => {
  try {
    const carritoToAdd = req.body;

  
    const hasMissingFields = carritoToAdd.products.some(
      (product) => !product.id || !product.quantity
    );

    if (hasMissingFields || carritoToAdd.products.length === 0) {
      return res.status(400).json({
        error: 'Los productos deben tener campos "id" y "quantity" completos',
      });
    }

  
    const productIds = carritoToAdd.products.map((product) => product.id);

    for (const productId of productIds) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "id inválido" });
      }
    }

  
    const groupedProducts = {};
    carritoToAdd.products.forEach((product) => {
      const { id, quantity } = product;
      if (!groupedProducts[id]) {
        groupedProducts[id] = parseInt(quantity, 10); 
      } else {
        groupedProducts[id] += parseInt(quantity, 10); 
      }
    });

 
    const carrito = new carritosModelo({
      productos: Object.keys(groupedProducts).map((id) => ({
        producto: id, 
        cantidad: groupedProducts[id], 
      })),
    });

    let carritoInsertado = await carrito.save();
    res.status(201).json({ carritoInsertado });
  } catch (error) {
    res.status(500).json({ error: "Error inesperado", detalle: error.message });
  }
});


//------------------------------------------------------------------------ PETICION PUT api/DBcarts/:cid

router.put("/:cid/products/:pid", async (req, res) => {
  try {
    const cid = req.params.cid; 
    const pid = req.params.pid; 
    const { quantity } = req.body; 

  
    if (!cid || !pid || quantity === undefined) {
      return res.status(400).json({
        error:
          "Todos los parámetros deben estar completos: cid, pid y quantity",
      });
    }

    
    if (
      !mongoose.Types.ObjectId.isValid(cid) ||
      !mongoose.Types.ObjectId.isValid(pid)
    ) {
      return res.status(400).json({
        error: "IDs inválidos",
      });
    }

 
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        error: "La cantidad debe ser un número válido y mayor que cero",
      });
    }


    const carrito = await carritosModelo.findOne({ _id: cid });

 
    if (!carrito) {
      return res.status(404).json({
        error: `El carrito con ID ${cid} no existe`,
      });
    }

    
    const indexToUpdate = carrito.productos.findIndex(
      (producto) => String(producto.producto) === pid
    );

  
    if (indexToUpdate === -1) {
      return res.status(404).json({
        error: `El producto con ID ${pid} no existe en el carrito`,
      });
    }


    carrito.productos[indexToUpdate].cantidad = parsedQuantity;

    
    const carritoActualizado = await carrito.save();

    res.status(200).json({
      mensaje: "Cantidad de producto actualizada en el carrito",
      carrito: carritoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error inesperado",
      detalle: error.message,
    });
  }
});

//------------------------------------------------------------------------ PETICION PUT api/DBcarts/:cid

router.put("/:cid", async (req, res) => {
  try {
    const cid = req.params.cid; 
    const nuevosProductos = req.body.products; 

    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(400).json({
        error: "ID de carrito inválido",
      });
    }

    
    const carrito = await carritosModelo.findOne({ _id: cid });


    if (!carrito) {
      return res.status(404).json({
        error: `El carrito con ID ${cid} no existe`,
      });
    }

    
    if (!Array.isArray(nuevosProductos)) {
      return res.status(400).json({
        error:
          "El cuerpo de la solicitud debe contener un arreglo de productos",
      });
    }

   
    const datosFaltantes = nuevosProductos.some(
      (product) => !product.id || !product.quantity
    );

    if (datosFaltantes) {
      return res.status(400).json({
        error: "Los nuevos productos deben contener campos 'id' y 'quantity'",
      });
    }

    
    const productIds = nuevosProductos.map((product) => product.id);

    for (const productId of productIds) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "ID de producto inválido" });
      }
    }

    
    carrito.products = nuevosProductos;

   
    const carritoActualizado = await carrito.save();

    res.status(200).json({
      mensaje: "Carrito actualizado con éxito",
      carrito: carritoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error inesperado",
      detalle: error.message,
    });
  }
});


//-------------------------------------------------- PETICION DELETE api/dbcarts/:cid

router.delete("/:cid", async (req, res) => {
  try {
    const cid = req.params.cid; // ID del carrito a eliminar

    // Verifica si el ID del carrito es válido
    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res.status(400).json({
        error: "ID de carrito inválido",
      });
    }

    // Busca y elimina el carrito por su ID
    const carritoEliminado = await carritosModelo.findByIdAndDelete(cid);

    // Verifica si el carrito existe
    if (!carritoEliminado) {
      return res.status(404).json({
        error: `El carrito con ID ${cid} no existe`,
      });
    }

    res.status(200).json({
      mensaje: "Carrito eliminado con éxito",
      carrito: carritoEliminado,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error inesperado",
      detalle: error.message,
    });
  }
});

//-------------------------------------------------- PETICION DELETE api/dbcarts/:cid/products/:pid 

router.delete("/:cid/products/:pid", async (req, res) => {
  try {
    const cid = req.params.cid; // ID del carrito
    const pid = req.params.pid; // ID del producto a eliminar

    // Verifica si los IDs son válidos
    if (
      !mongoose.Types.ObjectId.isValid(cid) ||
      !mongoose.Types.ObjectId.isValid(pid)
    ) {
      return res.status(400).json({
        error: "IDs inválidos",
      });
    }

    // Busca el carrito por su ID
    const carrito = await carritosModelo.findOne({ _id: cid });

    // Verifica si el carrito existe
    if (!carrito) {
      return res.status(404).json({
        error: `El carrito con ID ${cid} no existe`,
      });
    }

    // Busca el índice del producto que se va a eliminar dentro del array de productos
    const indexToDelete = carrito.productos.findIndex(
      (producto) => String(producto.producto) === pid
    );

    // Verifica si el producto a eliminar existe en el carrito
    if (indexToDelete === -1) {
      return res.status(404).json({
        error: `El producto con ID ${pid} no existe en el carrito`,
      });
    }

    // Elimina el producto del array de productos del carrito
    carrito.productos.splice(indexToDelete, 1);

    // Guarda el carrito actualizado en la base de datos
    const carritoActualizado = await carrito.save();

    res.status(200).json({
      mensaje: "Producto eliminado del carrito",
      carrito: carritoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error inesperado",
      detalle: error.message,
    });
  }
});




module.exports = router;
