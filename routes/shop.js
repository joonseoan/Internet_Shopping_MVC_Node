const path = require('path');

const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop');
const isAuth = require('../middleware/is-auth');


router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.get('/checkout', isAuth, shopController.getCheckout);

// In order to avoid csurf's hidden input
//  it is required to be bounced out of the route.
// BTW, csuft and hidden input does not supported by Stripe.
// Therefore, we need to avoid the error caused by csurl input 
//  which is not available.
// router.post('/create-order', isAuth, shopController.postOrder);

router.get('/orders', isAuth, shopController.getOrders);

// download setup by using "wild card"
router.get('/orders/:orderId', isAuth, shopController.getInvoice);

module.exports = router;
