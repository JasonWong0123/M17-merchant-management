# M17 Merchant Management API - Integration Guide

## 🎯 For Integration Teams

This document provides everything your integration team needs to deploy and integrate the M17 Merchant Management API.

## 📦 What You're Getting

A complete **Merchant Management Microservice** with:
- ✅ **Menu Management**: Categories and dishes CRUD operations
- ✅ **Inventory Management**: Stock tracking and alerts
- ✅ **Reports & Analytics**: Order statistics and business intelligence
- ✅ **Docker Ready**: Containerized for easy deployment
- ✅ **Production Ready**: Logging, error handling, validation

## 🚀 Quick Deployment

### Option 1: Docker Hub (Recommended)

```bash
# Pull and run the container
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest

docker run -d \
  --name m17-merchant-api \
  -p 3000:3000 \
  -v ./data:/app/data \
  -v ./logs:/app/logs \
  -e NODE_ENV=production \
  --restart unless-stopped \
  ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
```

### Option 2: Docker Compose

```bash
# Download docker-compose.yml from the repository
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/M17-merchant-management/main/docker-compose.yml

# Start the service
docker-compose up -d
```

### Option 3: Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f https://raw.githubusercontent.com/YOUR_USERNAME/M17-merchant-management/main/k8s/
```

## 🔌 API Integration

### Base URL
```
http://localhost:3000/api/merchant
```

### Key Endpoints

#### Menu Management
```bash
GET    /api/merchant/categories          # List categories
POST   /api/merchant/category            # Create category
GET    /api/merchant/dishes              # List dishes
POST   /api/merchant/dish                # Create dish
PUT    /api/merchant/dish/{id}/status    # Update dish status
```

#### Inventory Management
```bash
GET    /api/merchant/inventory           # Get inventory
PUT    /api/merchant/dish/{id}/stock     # Update stock
GET    /api/merchant/dishes/low-stock    # Low stock alerts
```

#### Reports & Analytics
```bash
GET    /api/merchant/orders/statistics   # Order statistics
GET    /api/merchant/reports/export      # Export reports
GET    /api/merchant/dashboard/summary   # Dashboard data
```

### Sample Integration Code

#### JavaScript/Node.js
```javascript
const axios = require('axios');

const merchantAPI = axios.create({
  baseURL: 'http://your-api-host:3000/api/merchant',
  timeout: 5000
});

// Get all dishes
const dishes = await merchantAPI.get('/dishes');

// Create new dish
const newDish = await merchantAPI.post('/dish', {
  categoryId: 'cat_1',
  name: 'New Dish',
  price: 29.99
});

// Update stock
await merchantAPI.put(`/dish/${dishId}/stock`, {
  stock: 100,
  alertThreshold: 10
});
```

#### Python
```python
import requests

BASE_URL = "http://your-api-host:3000/api/merchant"

# Get dishes
response = requests.get(f"{BASE_URL}/dishes")
dishes = response.json()

# Create dish
new_dish = {
    "categoryId": "cat_1",
    "name": "New Dish",
    "price": 29.99
}
response = requests.post(f"{BASE_URL}/dish", json=new_dish)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Production Value |
|----------|-------------|---------|------------------|
| `NODE_ENV` | Environment | development | production |
| `PORT` | Server port | 3000 | 3000 |
| `LOG_LEVEL` | Log level | info | warn |
| `ALLOWED_ORIGINS` | CORS origins | * | your-domain.com |

### Production Configuration

Create `.env` file:
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

## 📊 Data Models

### Category
```json
{
  "id": "cat_1",
  "name": "Main Dishes",
  "description": "Traditional main course dishes",
  "sortOrder": 1,
  "isActive": true,
  "createdAt": "2024-11-13T00:00:00Z",
  "updatedAt": "2024-11-13T00:00:00Z"
}
```

### Dish
```json
{
  "id": "dish_1",
  "categoryId": "cat_1",
  "name": "Kung Pao Chicken",
  "description": "Spicy stir-fried chicken",
  "price": 38.00,
  "status": "on",
  "stock": 50,
  "ingredients": ["chicken", "peanuts"],
  "allergens": ["nuts"],
  "isSpicy": true,
  "isVegetarian": false,
  "createdAt": "2024-11-13T00:00:00Z",
  "updatedAt": "2024-11-13T00:00:00Z"
}
```

### Inventory
```json
{
  "dishId": "dish_1",
  "stock": 50,
  "alertThreshold": 10,
  "supplier": "Fresh Ingredients Co.",
  "cost": 15.50,
  "expiryDate": "2024-12-31T23:59:59Z",
  "lastUpdated": "2024-11-13T00:00:00Z"
}
```

## 🔒 Security & Authentication

### Current State
- **No authentication required** (ready for your auth layer)
- **CORS configured** for cross-origin requests
- **Input validation** with Joi schemas
- **Error sanitization** in production

### Adding Authentication
To add JWT authentication, modify the middleware:

```javascript
// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Access token required' }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Invalid token' }
      });
    }
    req.user = user;
    next();
  });
};
```

## 📈 Monitoring & Logging

### Application Logs
- **Location**: `/app/logs/app.log` (in container)
- **Format**: JSON structured logs
- **Levels**: error, warn, info, debug

### Metrics
- **Request/Response times**
- **Error rates**
- **Business metrics** (orders, revenue, etc.)

### Monitoring Setup
```yaml
# docker-compose.yml with monitoring
version: '3.8'
services:
  m17-api:
    image: ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
    ports:
      - "3000:3000"
  
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

## 🔄 Data Persistence

### Current: JSON Files
- **Location**: `/app/data/` directory
- **Files**: categories.json, dishes.json, inventory.json
- **Backup**: Automatic .backup files created

### Migrating to Database
To replace JSON storage with your database:

1. **Modify** `services/data.store.js`
2. **Add** database connection configuration
3. **Update** environment variables
4. **Run** data migration scripts

Example for PostgreSQL:
```javascript
// Replace in services/data.store.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async readData(table) {
  const result = await pool.query(`SELECT * FROM ${table}`);
  return result.rows;
}
```

## 🚦 Load Balancing & Scaling

### Horizontal Scaling
```bash
# Docker Compose scaling
docker-compose up -d --scale m17-merchant-api=3

# Kubernetes scaling
kubectl scale deployment m17-merchant-api --replicas=5
```

### Load Balancer Configuration
```nginx
upstream m17_backend {
    least_conn;
    server m17-api-1:3000;
    server m17-api-2:3000;
    server m17-api-3:3000;
}

server {
    listen 80;
    location /api/merchant {
        proxy_pass http://m17_backend;
    }
}
```

## 🧪 Testing

### API Testing
Use the included Postman collection:
```bash
# Import M17-Postman-Collection.json into Postman
# Set baseUrl variable to your API endpoint
# Run the collection tests
```

### Integration Testing
```javascript
// Example integration test
const request = require('supertest');
const app = require('./app');

describe('M17 API Integration', () => {
  test('GET /api/merchant/categories', async () => {
    const response = await request(app)
      .get('/api/merchant/categories')
      .expect(200);
    
    expect(response.body.data).toHaveLength(4);
  });
});
```

## 📞 Support & Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process or use different port
```

#### Permission Denied
```bash
# Fix data directory permissions
chmod -R 755 data logs
```

#### Memory Issues
```bash
# Increase container memory
docker run -m 1g ghcr.io/YOUR_USERNAME/m17-merchant-management:latest
```

### Getting Help
- **Documentation**: README.md in repository
- **Issues**: GitHub Issues page
- **API Docs**: Built-in at `/api/merchant/menu/docs`

## ✅ Integration Checklist

- [ ] **Deploy** the container successfully
- [ ] **Test** all API endpoints
- [ ] **Configure** environment variables
- [ ] **Set up** persistent storage
- [ ] **Configure** CORS for your domain
- [ ] **Add** authentication if needed
- [ ] **Set up** monitoring and logging
- [ ] **Configure** load balancing
- [ ] **Test** error handling
- [ ] **Set up** backup strategy
- [ ] **Document** integration points
- [ ] **Train** team on API usage

## 🎉 You're Ready!

The M17 Merchant Management API is production-ready and waiting for your integration. 

**Next Steps:**
1. Deploy the container
2. Test the endpoints
3. Integrate with your existing system
4. Monitor and scale as needed

**Questions?** Check the repository documentation or contact the development team.

---

**Happy Integrating!** 🚀
