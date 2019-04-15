const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const stripe = require("stripe")(process.env.STRIPE_KEY);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  console.log(typeof page);
  
  let totalItems = 0;

  Product.find()
    .countDocuments()
    .then(numberProducts => {
      totalItems = numberProducts;
     // console.log('totalItems: ', numberProducts);
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      // only 2 products in the page 2
      //console.log(products) ;
        res.render('shop/product-list', {
          prods: products,
          pageTitle: 'Product List',
          path: '/products',
          currentPage: page,
          //totalProducts: totalItems,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage : page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)                        
        });
    })
    .catch(err => {
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors); 
    });

};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      });
    })
    .catch(err =>{
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);    
    });
};

exports.getIndex = (req, res, next) => {
  // || 1 only when localhost:3000 is loaded without a query  like /?page=1
  // Therefore default page = 1 in this case

  // Basically, res.xxx => String
  const page = Number(req.query.page) || 1;
  console.log(typeof page);
  
  let totalItems = 0;

  Product.find()
    .countDocuments()
    .then(numberProducts => {
      totalItems = numberProducts;
     // console.log('totalItems: ', numberProducts);
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
      // only 2 products in the page 2
      //console.log(products) ;
        res.render('shop/index', {
          prods: products,
          pageTitle: 'Shop',
          path: '/',
          currentPage: page,
          //totalProducts: totalItems,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage : page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)                        
        });
    })
    .catch(err => {
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors); 
    });


  // Product.find()
  //   // (page - 1) * ITEMS_PER_PAGE: offset
  //   //  that pull out data of the array of mongodb
  //   //  from that index, [(page - 1) * ITEMS_PER_PAGE] number
  //   .skip((page - 1) * ITEMS_PER_PAGE)
  //   // limit 2 elements only
  //   .limit(ITEMS_PER_PAGE)
  //   .then(products => {
  //     res.render('shop/index', {
  //       prods: products,
  //       pageTitle: 'Shop',
  //       path: '/'
  //     });
  //   })
  //   .catch(err =>{
  //     let message;
  //     const errors = new Error(message || err);
  //     errors.httpStatusCode = 500;
  //     return next(errors);    
  // });
};

exports.getCart = (req, res, next) => {  
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
        // find above
        // isAuthenticated: req.session.isAuthenticated
      });
    })
    .catch(err =>{
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);    
  });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err =>{
      
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);    
  });
};

exports.getCheckout = (req, res, next) => {
  // with stripe's built-in checkout button
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      let total = 0;
      products.forEach(product => {
        total += product.qty * product.productId.price;
      })
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products,
        totalSum: total
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 5000;
      next(error);
    });  
}

exports.postOrder = (req, res, next) => {

// Token is created using Checkout or Elements!
// Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express
  let total = 0;

  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { qty: i.qty, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.session.user
        },
        products: products
      });
      return order.save();
    })
    .then(order => {

      order.products.forEach(prod => {
        total += prod.qty * prod.product.price;
      });

      const charge = stripe.charges.create({
        amount: total * 100,
        currency: 'cad',
        description: order._id.toString(),
        source: token,
        // we can add metadata here
        metadata: { user_id: order.products[0].product.userId.toString() }
      });
      
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err =>{
      
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);    
  });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.session.user._id })
    .then(orders => {

      console.log(orders)
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err =>{      
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);    
  });
};

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params;

  Order.findById(orderId)
    .then(order => {

      if(!order) {
        return next(new Error('Order is not available.'));
      }
      if(order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error('User is not aurthorized to download the invoice.'));
      }

      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);      
      const pdfDoc = new PDFDocument();

      // 1)
      // created a writable data (in the pdf file) in the server side with data below
      // pdfDoc (readable data)

      // we can send this file to the client using res.send() as well but not here
      // pdfDoc.pipe(fs.createWriteStream(invoicePath));

      // On sending data with definition of "Content-Type"
      // -------------------------------------------------------------------------------------------------------------
      // "Setup readable streams"
      pdfDoc.fontSize(26).text('Your Invoice', {
        underline: true
      });

      pdfDoc.text('----------------------------');

      let totalPrice = 0;
      order.products.forEach(prod => {
        totalPrice += prod.qty * prod.product.price;
        pdfDoc
        .fontSize(14)
        .text(prod.product.title + 
          ' - ' + 
          prod.qty + 
          ' x ' 
          + '$' 
          + prod.product.price
          );
      });
      pdfDoc.text('------------------------------');
      pdfDoc.fontSize(20).text('Total Price: ' + totalPrice);

      // to plugging in the pdf application in the user side.
      res.setHeader('Content-Type', 'application/pdf');  
      res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');    
      
      // 2) 
      // send the pdfDoC data through "res" object which is wriatable *************8
      // It is not sending the pdf file created above.
      pdfDoc.pipe(res);
      pdfDoc.end();
      // ----------------------------------------------------------------------------------------------------------------------
    })
    .catch(err => {
      let message;
      const errors = new Error(message || err);
      errors.httpStatusCode = 500;
      return next(errors);  
    })
};
