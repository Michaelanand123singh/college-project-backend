const fs = require('fs');
const path = require('path');

// Helper function to read JSON data files
const readData = (filename) => {
  try {
    const filePath = path.join(__dirname, '../data', `${filename}.json`);
    
    // Check if file exists, if not create it with empty array
    if (!fs.existsSync(filePath)) {
      const initialData = [];
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}.json:`, error);
    return [];
  }
};

// Helper function to write JSON data files
const writeData = (filename, data) => {
  try {
    const filePath = path.join(__dirname, '../data', `${filename}.json`);
    
    // Ensure data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}.json:`, error);
    return false;
  }
};

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Helper function to generate unique ID
const generateId = () => {
  return Date.now() + Math.random().toString(36).substr(2, 9);
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Helper function to calculate pagination
const getPaginationData = (totalItems, page = 1, limit = 10) => {
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * limit;

  return {
    totalItems,
    totalPages,
    currentPage,
    limit,
    offset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

// Helper function to validate required fields
const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing
  };
};

// Helper function to create API response
const createResponse = (success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data) response.data = data;
  if (errors) response.errors = errors;

  return response;
};

// Helper function to handle async errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper function to generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// Helper function to filter sensitive data from user object
const filterUserData = (user) => {
  const { password, ...filteredUser } = user;
  return filteredUser;
};

module.exports = {
  readData,
  writeData,
  isValidEmail,
  sanitizeInput,
  generateId,
  formatCurrency,
  getPaginationData,
  validateRequiredFields,
  createResponse,
  asyncHandler,
  generateOrderNumber,
  filterUserData
};