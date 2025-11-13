# M17 Merchant Management API - Deployment Guide

This guide provides detailed instructions for deploying the M17 Merchant Management API in various environments.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Integration Guide](#integration-guide)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### For Integration Teams

The M17 Merchant Management API is a standalone microservice that can be integrated into your existing food delivery tracking system.

**Key Integration Points:**
- REST API endpoints for menu, inventory, and reports
- JSON-based data storage (can be replaced with your database)
- Docker-ready for containerized deployment
- Stateless design for horizontal scaling

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+ (optional)

### Build the Image

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/M17-merchant-management.git
cd M17-merchant-management

# Build the Docker image
docker build -t m17-merchant-api:latest .
```

### Run as Standalone Container

```bash
docker run -d \
  --name m17-merchant-api \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  m17-merchant-api:latest
```

### Run with Docker Compose

```bash
# Basic deployment
docker-compose up -d

# With Redis caching
docker-compose --profile with-cache up -d

# With Nginx reverse proxy
docker-compose --profile with-proxy up -d

# Full stack with monitoring
docker-compose --profile with-cache --profile with-proxy --profile with-monitoring up -d
```

### Docker Compose Configuration

The `docker-compose.yml` includes:
- **Main API service**: Core merchant management API
- **Nginx** (optional): Reverse proxy and load balancer
- **Redis** (optional): Caching layer
- **Prometheus** (optional): Metrics collection
- **Grafana** (optional): Metrics visualization

## ☸️ Kubernetes Deployment

### Basic Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: m17-merchant-api
  labels:
    app: m17-merchant-api
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
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: m17-data-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: m17-logs-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: m17-merchant-api
spec:
  selector:
    app: m17-merchant-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Persistent Volume Claims

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: m17-data-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: m17-logs-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
```

### ConfigMap for Environment Variables

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: m17-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
  ALLOWED_ORIGINS: "*"
```

## 🔗 Integration Guide

### API Gateway Integration

If you're using an API Gateway (Kong, Nginx, AWS API Gateway):

```nginx
# Nginx example
location /merchant {
    proxy_pass http://m17-merchant-api:3000/api/merchant;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Service Mesh Integration (Istio)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: m17-merchant-api
spec:
  hosts:
  - m17-merchant-api
  http:
  - route:
    - destination:
        host: m17-merchant-api
        port:
          number: 3000
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

### Database Integration

To replace JSON file storage with a database:

1. Modify `services/data.store.js` to use your database client
2. Update connection configuration in environment variables
3. Implement database migrations if needed

Example for PostgreSQL:
```javascript
// services/data.store.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Replace file operations with database queries
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production) | development | No |
| `PORT` | Server port | 3000 | No |
| `HOST` | Server host | 0.0.0.0 | No |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | info | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | * | No |

### Production Configuration

Create a `.env` file for production:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=warn
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### Security Considerations

1. **CORS**: Configure `ALLOWED_ORIGINS` for production
2. **Rate Limiting**: Implement at API Gateway level
3. **Authentication**: Add JWT middleware if needed
4. **HTTPS**: Use reverse proxy (Nginx) for SSL termination
5. **Secrets**: Use Kubernetes Secrets or environment variables

## 📊 Monitoring

### Application Logs

Logs are written to `logs/app.log` and stdout:

```bash
# View logs in Docker
docker logs -f m17-merchant-api

# View logs in Kubernetes
kubectl logs -f deployment/m17-merchant-api
```

### Metrics

The application exposes metrics that can be scraped by Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'm17-merchant-api'
    static_configs:
      - targets: ['m17-merchant-api:3000']
```

### Health Checks

The API provides endpoints for health monitoring:
- `GET /api` - API information
- `GET /api/merchant/categories` - Quick health check

## 🔧 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker logs m17-merchant-api

# Check if port is available
netstat -an | grep 3000
```

#### Permission Issues
```bash
# Fix data directory permissions
chmod -R 755 data logs
chown -R 1001:1001 data logs
```

#### Memory Issues
```bash
# Increase container memory limit
docker run -m 1g m17-merchant-api:latest
```

### Performance Tuning

#### Node.js Options
```bash
# Increase heap size
docker run -e NODE_OPTIONS="--max-old-space-size=2048" m17-merchant-api:latest
```

#### Scaling
```bash
# Scale with Docker Compose
docker-compose up -d --scale m17-merchant-api=3

# Scale with Kubernetes
kubectl scale deployment m17-merchant-api --replicas=5
```

## 📞 Support

For integration support:
- **Documentation**: See README.md for API documentation
- **Issues**: Report issues on GitHub
- **Contact**: integration-team@yourdomain.com

## 🔄 Updates and Versioning

### Pulling Updates

```bash
# Pull latest image
docker pull ghcr.io/YOUR_USERNAME/m17-merchant-management:latest

# Restart container
docker-compose down
docker-compose up -d
```

### Version Tags

Images are tagged with:
- `latest` - Latest stable release
- `v1.0.0` - Specific version
- `main` - Latest from main branch

## 📝 Checklist for Integration Teams

- [ ] Review API endpoints and data models
- [ ] Configure environment variables
- [ ] Set up persistent storage for data
- [ ] Configure logging and monitoring
- [ ] Set up CORS for your domain
- [ ] Implement authentication if needed
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS termination
- [ ] Test all endpoints
- [ ] Set up backup strategy
- [ ] Configure alerting
- [ ] Document integration points

---

**Ready to deploy!** 🚀

For questions or issues, please contact the development team or open an issue on GitHub.
