/**
 * Data Store Service
 * 
 * This service provides a unified interface for reading and writing JSON data files.
 * It handles file operations, error handling, and data validation for the merchant management system.
 * 
 * Design decisions:
 * - Uses synchronous file operations for simplicity in demo environment
 * - Implements atomic writes to prevent data corruption
 * - Provides generic CRUD operations that can be used by all service layers
 * - Includes backup functionality for data safety
 */

const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Configure logger for data store operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/app.log') }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class DataStore {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.ensureDataDirectory();
  }

  /**
   * Ensures the data directory exists
   * Creates the directory if it doesn't exist
   */
  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      logger.info('Created data directory');
    }
  }

  /**
   * Gets the full file path for a given filename
   * @param {string} filename - The name of the JSON file (without extension)
   * @returns {string} Full file path
   */
  getFilePath(filename) {
    return path.join(this.dataPath, `${filename}.json`);
  }

  /**
   * Reads data from a JSON file
   * @param {string} filename - The name of the JSON file (without extension)
   * @returns {any} Parsed JSON data
   * @throws {Error} If file doesn't exist or contains invalid JSON
   */
  readData(filename) {
    try {
      const filePath = this.getFilePath(filename);
      
      if (!fs.existsSync(filePath)) {
        logger.warn(`File not found: ${filename}.json, returning empty array`);
        return [];
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      logger.info(`Successfully read data from ${filename}.json`);
      return data;
    } catch (error) {
      logger.error(`Error reading data from ${filename}.json:`, error);
      throw new Error(`Failed to read data from ${filename}.json: ${error.message}`);
    }
  }

  /**
   * Writes data to a JSON file
   * @param {string} filename - The name of the JSON file (without extension)
   * @param {any} data - Data to write to the file
   * @throws {Error} If write operation fails
   */
  writeData(filename, data) {
    try {
      const filePath = this.getFilePath(filename);
      const jsonData = JSON.stringify(data, null, 2);
      
      // Create backup before writing
      this.createBackup(filename);
      
      // Write data atomically
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, jsonData, 'utf8');
      fs.renameSync(tempPath, filePath);
      
      logger.info(`Successfully wrote data to ${filename}.json`);
    } catch (error) {
      logger.error(`Error writing data to ${filename}.json:`, error);
      throw new Error(`Failed to write data to ${filename}.json: ${error.message}`);
    }
  }

  /**
   * Creates a backup of the current data file
   * @param {string} filename - The name of the JSON file (without extension)
   */
  createBackup(filename) {
    try {
      const filePath = this.getFilePath(filename);
      
      if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup`;
        fs.copyFileSync(filePath, backupPath);
        logger.info(`Created backup for ${filename}.json`);
      }
    } catch (error) {
      logger.warn(`Failed to create backup for ${filename}.json:`, error);
      // Don't throw error for backup failure, just log it
    }
  }

  /**
   * Finds an item by ID in an array
   * @param {Array} data - Array of objects to search
   * @param {string} id - ID to search for
   * @returns {Object|null} Found item or null
   */
  findById(data, id) {
    return data.find(item => item.id === id) || null;
  }

  /**
   * Finds the index of an item by ID in an array
   * @param {Array} data - Array of objects to search
   * @param {string} id - ID to search for
   * @returns {number} Index of the item or -1 if not found
   */
  findIndexById(data, id) {
    return data.findIndex(item => item.id === id);
  }

  /**
   * Generates a unique ID for new items
   * @param {string} prefix - Prefix for the ID (e.g., 'dish_', 'cat_')
   * @param {Array} existingData - Array of existing items to check for uniqueness
   * @returns {string} Unique ID
   */
  generateId(prefix, existingData) {
    let counter = 1;
    let newId;
    
    do {
      newId = `${prefix}${counter}`;
      counter++;
    } while (existingData.some(item => item.id === newId));
    
    return newId;
  }

  /**
   * Validates that required fields exist in an object
   * @param {Object} obj - Object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @throws {Error} If any required field is missing
   */
  validateRequiredFields(obj, requiredFields) {
    const missingFields = requiredFields.filter(field => 
      obj[field] === undefined || obj[field] === null || obj[field] === ''
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Adds timestamps to an object
   * @param {Object} obj - Object to add timestamps to
   * @param {boolean} isUpdate - Whether this is an update (only adds updatedAt)
   * @returns {Object} Object with timestamps
   */
  addTimestamps(obj, isUpdate = false) {
    const now = new Date().toISOString();
    
    if (!isUpdate) {
      obj.createdAt = now;
    }
    obj.updatedAt = now;
    
    return obj;
  }

  /**
   * Filters data based on query parameters
   * @param {Array} data - Array of data to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  filterData(data, filters) {
    return data.filter(item => {
      return Object.keys(filters).every(key => {
        if (filters[key] === undefined || filters[key] === null) {
          return true;
        }
        
        // Handle different filter types
        if (typeof filters[key] === 'string') {
          return item[key] && item[key].toString().toLowerCase().includes(filters[key].toLowerCase());
        }
        
        return item[key] === filters[key];
      });
    });
  }

  /**
   * Sorts data by a specified field
   * @param {Array} data - Array of data to sort
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - 'asc' or 'desc'
   * @returns {Array} Sorted data
   */
  sortData(data, sortBy = 'id', sortOrder = 'asc') {
    return data.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });
  }
}

// Export singleton instance
module.exports = new DataStore();
