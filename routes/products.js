const express = require('express');
const { readData, writeData } = require('../utils/helpers');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all products
router.get('/', (req, res) => {
  try {
    const { category, search, limit, page = 1 } = req.query;
    let products = readData('products');

    // Filter by category
    if (category && category !== 'All') {
      products = products.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination
    const pageSize = limit ? parseInt(limit) : products.length;
    const startIndex = (parseInt(page) - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      total: products.length,
      page: parseInt(page),
      pageSize,
      totalPages: Math.ceil(products.length / pageSize)
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get featured products
router.get('/featured', (req, res) => {
  try {
    const products = readData('products');
    const featuredProducts = products
      .filter(product => product.featured)
      .slice(0, 6);

    // If no featured products, return first 6
    if (featuredProducts.length === 0) {
      return res.json(products.slice(0, 6));
    }

    res.json(featuredProducts);

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Error fetching featured products' });
  }
});

// Get product categories
router.get('/categories', (req, res) => {
  try {
    const products = readData('products');
    const categories = [...new Set(products.map(product => product.category))];
    
    res.json(categories);

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const products = readData('products');
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Create new product (Admin only)
router.post('/', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { name, price, category, description, image, featured = false } = req.body;

    // Validation
    if (!name || !price || !category || !description) {
      return res.status(400).json({ 
        message: 'Name, price, category, and description are required' 
      });
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    const products = readData('products');
    
    // Check if product name already exists
    const existingProduct = products.find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    );

    if (existingProduct) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const newProduct = {
      id: Date.now(),
      name,
      price: parseFloat(price),
      category,
      description,
      image: image || '/api/placeholder/300/200',
      featured: Boolean(featured),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    writeData('products', products);

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Update product (Admin only)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const productId = parseInt(req.params.id);
    const { name, price, category, description, image, featured } = req.body;

    const products = readData('products');
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Validation
    if (price && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    // Check if new name conflicts with existing product
    if (name && name !== products[productIndex].name) {
      const existingProduct = products.find(p => 
        p.name.toLowerCase() === name.toLowerCase() && p.id !== productId
      );

      if (existingProduct) {
        return res.status(400).json({ message: 'Product with this name already exists' });
      }
    }

    // Update product fields
    if (name) products[productIndex].name = name;
    if (price) products[productIndex].price = parseFloat(price);
    if (category) products[productIndex].category = category;
    if (description) products[productIndex].description = description;
    if (image) products[productIndex].image = image;
    if (featured !== undefined) products[productIndex].featured = Boolean(featured);
    
    products[productIndex].updatedAt = new Date().toISOString();

    writeData('products', products);

    res.json({
      message: 'Product updated successfully',
      product: products[productIndex]
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product (Admin only)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const productId = parseInt(req.params.id);
    const products = readData('products');
    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const deletedProduct = products.splice(productIndex, 1)[0];
    writeData('products', products);

    res.json({
      message: 'Product deleted successfully',
      product: deletedProduct
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = router;