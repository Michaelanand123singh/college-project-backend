const express = require('express');
const { readData, writeData } = require('../utils/helpers');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Create new order
router.post('/', (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      address,
      city,
      zipCode,
      paymentMethod,
      items,
      total,
      userId
    } = req.body;

    // Validation
    if (!email || !firstName || !lastName || !address || !city || !zipCode || !paymentMethod) {
      return res.status(400).json({ message: 'All billing information fields are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!total || total <= 0) {
      return res.status(400).json({ message: 'Invalid order total' });
    }

    // Validate items and calculate total
    const products = readData('products');
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${item.id} not found` });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: 'Invalid quantity for product: ' + product.name });
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemTotal
      });
    }

    // Check if calculated total matches provided total (with small tolerance for floating point)
    if (Math.abs(calculatedTotal - total) > 0.01) {
      return res.status(400).json({ 
        message: 'Order total mismatch',
        calculated: calculatedTotal,
        provided: total
      });
    }

    const orders = readData('orders');
    
    const newOrder = {
      id: Date.now(),
      orderNumber: `ORD-${Date.now()}`,
      userId: userId || null,
      customerInfo: {
        email,
        firstName,
        lastName,
        address,
        city,
        zipCode
      },
      items: validatedItems,
      total: calculatedTotal,
      paymentMethod,
      status: 'completed', // In a real app, this would be 'pending' initially
      paymentStatus: 'paid', // In a real app, this would be handled by payment processor
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(newOrder);
    writeData('orders', orders);

    // In a real application, you would:
    // 1. Process payment with payment gateway
    // 2. Send confirmation email with download links
    // 3. Generate license keys
    // 4. Handle inventory management

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Get all orders (Admin only)
router.get('/', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    let orders = readData('orders');

    // Filter by status
    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageSize = parseInt(limit);
    const startIndex = (parseInt(page) - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = orders.slice(startIndex, endIndex);

    res.json({
      orders: paginatedOrders,
      total: orders.length,
      page: parseInt(page),
      pageSize,
      totalPages: Math.ceil(orders.length / pageSize)
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get user's orders
router.get('/my-orders', authMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = readData('orders');
    
    // Filter orders for current user
    let userOrders = orders.filter(order => order.userId === req.user.userId);

    // Sort by creation date (newest first)
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageSize = parseInt(limit);
    const startIndex = (parseInt(page) - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = userOrders.slice(startIndex, endIndex);

    res.json({
      orders: paginatedOrders,
      total: userOrders.length,
      page: parseInt(page),
      pageSize,
      totalPages: Math.ceil(userOrders.length / pageSize)
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// Get single order
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const orders = readData('orders');
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to view this order
    if (req.user.role !== 'admin' && order.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// Update order status (Admin only)
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const orders = readData('orders');
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Order not found' });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    writeData('orders', orders);

    res.json({
      message: 'Order status updated successfully',
      order: orders[orderIndex]
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// Delete order (Admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const orderId = parseInt(req.params.id);
    const orders = readData('orders');
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const deletedOrder = orders.splice(orderIndex, 1)[0];
    writeData('orders', orders);

    res.json({
      message: 'Order deleted successfully',
      order: deletedOrder
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Error deleting order' });
  }
});

// Get order statistics (Admin only)
router.get('/stats/summary', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const orders = readData('orders');
    
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Error fetching order statistics' });
  }
});

module.exports = router;