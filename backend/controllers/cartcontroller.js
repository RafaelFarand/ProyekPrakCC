import Cart from "../models/cartmodel.js";
import Order from "../models/modelpembelian.js";
import Product from "../models/sparepartmodel.js";

export const getCartItems = async(req, res) => {
    try {
        const cart = await Cart.findAll({
            where: {
                user_id: req.params.id_user
            },
            include: [{
                model: Product,
                attributes: ['name', 'price', 'image', 'url']
            }]
        });
        res.json(cart);
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const addToCart = async(req, res) => {
    const {user_id, product_id, quantity} = req.body;
    try {
        const existingItem = await Cart.findOne({
            where: {
                user_id: user_id,
                product_id: product_id
            }
        });

        if(existingItem) {
            await Cart.update({
                quantity: existingItem.quantity + parseInt(quantity)
            }, {
                where: {
                    id: existingItem.id
                }
            });
        } else {
            await Cart.create({
                user_id: user_id,
                product_id: product_id,
                quantity: quantity
            });
        }
        res.json({msg: "Product added to cart"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const updateCartItem = async(req, res) => {
    try {
        await Cart.update({
            quantity: req.body.quantity
        }, {
            where: {
                id: req.params.id
            }
        });
        res.json({msg: "Cart updated"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const removeFromCart = async(req, res) => {
    try {
        await Cart.destroy({
            where: {
                id: req.params.id
            }
        });
        res.json({msg: "Item removed from cart"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const checkout = async(req, res) => {
    try {
        const {user_id, items} = req.body;
        
        for(let item of items) {
            const product = await Product.findOne({
                where: {id: item.product_id}
            });
            
            if(product.stock < item.quantity) {
                return res.status(400).json({msg: `${product.name} stock not enough`});
            }

            await Order.create({
                user_id: user_id,
                product_id: item.product_id,
                quantity: item.quantity,
                total_price: item.quantity * product.price,
                status: 'pending'
            });

            await Product.update({
                stock: product.stock - item.quantity
            }, {
                where: {id: item.product_id}
            });
        }

        await Cart.destroy({
            where: {user_id: user_id}
        });

        res.json({msg: "Checkout successful"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const getOrders = async(req, res) => {
    try {
        const orders = await Order.findAll({
            where: {
                user_id: req.params.id_user
            },
            include: [{
                model: Product,
                attributes: ['name', 'price', 'image', 'url']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const processPayment = async(req, res) => {
    try {
        await Order.update({
            status: 'paid'
        }, {
            where: {
                id: req.params.id
            }
        });
        res.json({msg: "Payment processed successfully"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const cancelOrder = async(req, res) => {
    try {
        const order = await Order.findOne({
            where: {id: req.params.id}
        });

        if(order.status === 'paid') {
            return res.status(400).json({msg: "Cannot cancel paid order"});
        }

        const product = await Product.findOne({
            where: {id: order.product_id}
        });

        await Product.update({
            stock: product.stock + order.quantity
        }, {
            where: {id: order.product_id}
        });

        await Order.update({
            status: 'cancelled'
        }, {
            where: {
                id: req.params.id
            }
        });

        res.json({msg: "Order cancelled successfully"});
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}