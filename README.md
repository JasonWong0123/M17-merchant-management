# M17 Merchant Management API

A comprehensive REST API for managing restaurant operations including menu management, inventory tracking, and business analytics. Built with Node.js and Express, designed for modular deployment in containerized environments.

> **For Integration Teams**: This module is ready for Docker deployment. See [Docker Deployment](#-docker-deployment) section below.

## 🚀 Features

### Menu Management
- **Categories**: Create, update, delete, and sort menu categories
- **Dishes**: Full CRUD operations for menu items with rich metadata
- **Status Management**: Enable/disable dishes individually or in batches
- **Image Upload**: Simulated image upload functionality for dish photos

### Inventory Management
- **Stock Tracking**: Real-time inventory levels with automatic updates
- **Low Stock Alerts**: Configurable thresholds with automated notifications
- **Batch Operations**: Efficient bulk stock updates
- **Expiry Management**: Track and alert on expiring inventory items
- **Supplier Integration**: Manage supplier information and costs

### Reports & Analytics
- **Order Statistics**: Comprehensive sales and order analytics
- **Promotion Analytics**: Track promotion performance and ROI
- **Review Statistics**: Customer satisfaction and feedback analysis
- **Custom Reports**: Flexible report generation with multiple export formats
- **Dashboard Metrics**: Real-time KPIs and performance indicators

## 📋 API Endpoints

### Menu Management
```
GET    /api/merchant/categories              # Get all categories
POST   /api/merchant/category               # Create category
PUT    /api/merchant/category/:id           # Update category
DELETE /api/merchant/category/:id           # Delete category
PUT    /api/merchant/categories/sort        # Update sort order

GET    /api/merchant/dishes                 # Get all dishes
GET    /api/merchant/dish/:id               # Get dish by ID
POST   /api/merchant/dish                   # Create dish
PUT    /api/merchant/dish/:id               # Update dish
DELETE /api/merchant/dish/:id               # Delete dish
PUT    /api/merchant/dish/:id/status        # Update dish status
PUT    /api/merchant/dishes/batch-status    # Batch status update
POST   /api/merchant/upload/dish-image      # Upload dish image
```

### Inventory Management
```
PUT    /api/merchant/dish/:id/stock         # Update dish stock
GET    /api/merchant/dishes/low-stock       # Get low stock items
GET    /api/merchant/inventory              # Get all inventory
POST   /api/merchant/dish/:id/adjust-stock  # Adjust stock levels
PUT    /api/merchant/inventory/batch-update # Batch stock update
GET    /api/merchant/inventory/summary      # Inventory summary
POST   /api/merchant/inventory/sync         # Sync inventory
```

### Reports & Analytics
```
GET    /api/merchant/orders/statistics      # Order statistics
GET    /api/merchant/promotions/statistics  # Promotion analytics
GET    /api/merchant/promotion/:id/analytics # Specific promotion data
GET    /api/merchant/reviews/statistics     # Review statistics
GET    /api/merchant/reports/export         # Export reports
POST   /api/merchant/analytics/custom       # Custom analytics
GET    /api/merchant/dashboard/summary      # Dashboard summary
```

## 🛠 Installation

### Prerequisites
- Node.js 16+ 
- npm 8+

### Setup

#### Local Development
1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/M17-merchant-management.git
   cd M17-merchant-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Start production server**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
M17-merchant-management/
├── app.js                 # Express application configuration
├── server.js              # Server entry point
├── package.json           # Dependencies and scripts
├── README.md              # Project documentation
├── routes/                # API route definitions
│   ├── menu.routes.js     # Menu management routes
│   ├── inventory.routes.js # Inventory management routes
│   └── reports.routes.js   # Reports and analytics routes
├── controllers/           # Request handlers
│   ├── menu.controller.js
│   ├── inventory.controller.js
│   └── reports.controller.js
├── services/              # Business logic layer
│   ├── data.store.js      # JSON file operations
│   ├── menu.service.js    # Menu business logic
│   ├── inventory.service.js # Inventory business logic
│   └── stats.service.js   # Statistics and reporting
├── validators/            # Input validation schemas
│   ├── menu.validators.js
│   ├── inventory.validators.js
│   └── reports.validators.js
├── middleware/            # Express middleware
│   ├── error.middleware.js # Error handling
│   └── notfound.middleware.js # 404 handling
├── data/                  # JSON data files
│   ├── categories.json    # Menu categories
│   ├── dishes.json        # Menu dishes
│   ├── inventory.json     # Inventory data
│   ├── orders.stats.json  # Order statistics
│   ├── promotions.stats.json # Promotion data
│   └── reviews.stats.json # Review statistics
└── logs/                  # Application logs
    └── app.log           # Main log file
```

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000                    # Server port (default: 3000)
HOST=0.0.0.0                # Server host (default: 0.0.0.0)
NODE_ENV=development         # Environment (development/production)
LOG_LEVEL=info              # Logging level (error/warn/info/debug)
ALLOWED_ORIGINS=*           # CORS allowed origins
```

### Data Storage
The application uses JSON files for data persistence:
- **Categories**: Menu category definitions
- **Dishes**: Menu item details with pricing and metadata
- **Inventory**: Stock levels, suppliers, and expiry dates
- **Statistics**: Pre-calculated analytics and reports

## 📊 Sample Data

The application includes comprehensive sample data:

### Categories
- Main Dishes, Appetizers, Beverages, Desserts

### Dishes
- Kung Pao Chicken ($38.00) - Spicy, 50 in stock
- Sweet and Sour Pork ($42.00) - 30 in stock
- Spring Rolls ($18.00) - Vegetarian, 3 in stock (low stock)
- Jasmine Tea ($12.00) - 100 in stock
- Mango Pudding ($22.00) - Currently unavailable

### Analytics Data
- Order statistics with peak hours and trends
- Promotion performance metrics
- Customer review analysis
- Inventory alerts and summaries

## 🚦 API Usage Examples

### Create a New Dish
```bash
curl -X POST http://localhost:3000/api/merchant/dish \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "cat_1",
    "name": "Spicy Beef Noodles",
    "description": "Traditional spicy beef noodle soup",
    "price": 45.00,
    "ingredients": ["beef", "noodles", "spices"],
    "isSpicy": true,
    "preparationTime": 25
  }'
```

### Update Inventory Stock
```bash
curl -X PUT http://localhost:3000/api/merchant/dish/dish_1/stock \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 75,
    "alertThreshold": 10,
    "supplier": "Premium Ingredients Ltd",
    "cost": 18.50
  }'
```

### Export Sales Report
```bash
curl "http://localhost:3000/api/merchant/reports/export?type=sales&format=csv&startDate=2024-11-01&endDate=2024-11-30"
```

### Get Low Stock Items
```bash
curl "http://localhost:3000/api/merchant/dishes/low-stock?threshold=5"
```

## 🐳 Docker Deployment

### Quick Start with Docker

#### Build the Docker Image
```bash
docker build -t m17-merchant-api:latest .
```

#### Run the Container
```bash
docker run -d \
  --name m17-merchant-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  m17-merchant-api:latest
```

#### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f m17-merchant-api

# Stop services
docker-compose down
```

### Docker Compose Profiles

The `docker-compose.yml` includes optional services:

```bash
# Run with Redis caching
docker-compose --profile with-cache up -d

# Run with Nginx reverse proxy
docker-compose --profile with-proxy up -d

# Run with monitoring (Prometheus + Grafana)
docker-compose --profile with-monitoring up -d

# Run all services
docker-compose --profile with-cache --profile with-proxy --profile with-monitoring up -d
```

### Environment Variables for Docker

Create a `.env` file for Docker deployment:
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=https://yourdomain.com
```

### Container Health Check

The Docker container includes built-in health checks:
```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' m17-merchant-api
```

### Integration with Existing Systems

#### As a Microservice
```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: m17-merchant-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: m17-merchant-api
  template:
    metadata:
      labels:
        app: m17-merchant-api
    spec:
      containers:
      - name: api
        image: m17-merchant-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /app/data
```

#### Behind a Load Balancer
```nginx
# Nginx configuration example
upstream m17_backend {
    least_conn;
    server m17-api-1:3000;
    server m17-api-2:3000;
    server m17-api-3:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location /api/merchant {
        proxy_pass http://m17_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 📈 Response Format

### Success Response
```json
{
  "data": {
    // Response data
  },
  "meta": {
    "message": "Operation completed successfully",
    "timestamp": "2024-11-13T03:30:00Z",
    "total": 10
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": ["Price must be a positive number"],
    "timestamp": "2024-11-13T03:30:00Z",
    "requestId": "req_1699847400_abc123"
  }
}
```

## 🔍 Validation Rules

### Menu Items
- **Name**: 1-100 characters, required
- **Price**: Positive number with 2 decimal places
- **Category**: Must reference existing category
- **Stock**: Non-negative integer
- **Status**: Either "on" or "off"

### Inventory
- **Stock**: Non-negative integer
- **Alert Threshold**: Non-negative integer
- **Cost**: Non-negative number
- **Expiry Date**: Future date in ISO format

### Reports
- **Date Range**: Valid ISO dates, end date after start date
- **Export Format**: json, csv, or xlsx
- **Report Type**: sales, inventory, reviews, promotions

## 🐛 Error Handling

The API provides comprehensive error handling:

- **400 Bad Request**: Invalid input data or parameters
- **404 Not Found**: Resource not found
- **409 Conflict**: Business logic conflicts (e.g., deleting category with dishes)
- **500 Internal Server Error**: Server-side errors

All errors include:
- Descriptive error codes
- Human-readable messages
- Detailed validation information
- Request tracking IDs
- Timestamps

## 📝 Logging

The application uses Winston for comprehensive logging:

- **Request/Response**: All HTTP requests and responses
- **Business Logic**: Service operations and data changes
- **Errors**: Detailed error information with stack traces
- **Performance**: Response times and resource usage

Log files are rotated automatically (5MB max, 5 files retained).

## 🔒 Security Features

- **Input Validation**: Comprehensive Joi-based validation
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: XSS protection, content type validation
- **Request Limits**: JSON payload size limits
- **Error Sanitization**: Production error message sanitization

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup
1. Set production environment variables
2. Configure log rotation
3. Set up reverse proxy (nginx/Apache)
4. Configure SSL certificates
5. Set up monitoring and health checks

## 📚 API Documentation

Interactive API documentation is available at:
- **Menu API**: `GET /api/merchant/menu/docs`
- **Inventory API**: `GET /api/merchant/inventory/docs`
- **Reports API**: `GET /api/merchant/reports/docs`

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive JSDoc comments
3. Include input validation for all endpoints
4. Write descriptive commit messages
5. Test all functionality before submitting

## 📄 License

MIT License - see LICENSE file for details.

## 📞 Support

For technical support or questions:
- **Email**: support@company.com
- **Documentation**: https://api-docs.company.com/m17-merchant-management
- **Repository**: https://github.com/company/m17-merchant-management

---

**Built with ❤️ for efficient restaurant management**
