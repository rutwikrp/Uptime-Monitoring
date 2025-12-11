# Uptime Monitoring System

A robust, self-hosted uptime monitoring service built with Node.js, PostgreSQL, and Docker. This system allows you to monitor the availability and performance of your websites, APIs, and services with configurable alerts and dashboards.

## ✨ Features

- **Multi-protocol Monitoring**: HTTP/HTTPS, TCP, and ICMP (ping) checks
- **Real-time Status Dashboard**: Visual overview of all monitored services
- **Configurable Alerting**: Email notifications with customizable thresholds
- **Scheduled Health Checks**: Automated monitoring at regular intervals
- **Incident History**: Detailed logs of all downtime events and recovery
- **Docker & Kubernetes Ready**: Containerized deployment options
- **RESTful API**: Full programmatic control over monitors and alerts
- **Webhook Support**: Integrate with external notification services

## 🏗️ Architecture

The system is built using a microservices architecture:

```
├── api/              # REST API service (Express.js)
├── worker/           # Background monitoring worker
├── shared/           # Shared utilities and models
├── migrations/       # Database schema migrations
├── k8s/base/         # Kubernetes deployment manifests
└── scripts/          # Utility scripts for setup and maintenance
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- Kubernetes cluster (optional)

### Installation

**Option 1: Using Docker Compose (Recommended)**
```bash
# Clone the repository
git clone https://github.com/rutwikrp/Uptime-Monitoring.git
cd Uptime-Monitoring

# Start all services
docker-compose up -d
```

**Option 2: Manual Setup**
```bash
# Clone the repository
git clone https://github.com/rutwikrp/Uptime-Monitoring.git
cd Uptime-Monitoring

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start services
npm run start:api     # Start API server
npm run start:worker  # Start monitoring worker
```

### Configuration

Edit the `.env` file to configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/uptime_monitor

# API Server
API_PORT=3000
API_HOST=0.0.0.0

# Worker Configuration
CHECK_INTERVAL=60000  # Check interval in milliseconds
ALERT_THRESHOLD=3     # Failed checks before alert

# Email Alerts (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
ALERT_EMAILS=admin@example.com

# Webhook
WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 📚 API Usage

### Create a Monitor
```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example API",
    "url": "https://api.example.com/health",
    "type": "http",
    "interval": 60,
    "alertContacts": ["admin@example.com"]
  }'
```

### Get Monitor Status
```bash
curl http://localhost:3000/api/monitors
```

### Check Incident History
```bash
curl http://localhost:3000/api/incidents
```

## 🐳 Kubernetes Deployment

Deploy to your Kubernetes cluster:

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/base/

# Or use kustomize
kubectl apply -k k8s/base/
```

The Kubernetes configuration includes:
- Deployment manifests for API and worker services
- PostgreSQL statefulset
- ConfigMaps and Secrets
- Service definitions and ingress

## 📊 Dashboard

Access the web dashboard at `http://localhost:3000` after starting the services. The dashboard provides:

- Real-time status of all monitors
- Uptime statistics and charts
- Incident history and timeline
- Configuration interface for monitors

## 🔧 Development

### Project Structure
- `api/`: Express.js API server with REST endpoints
- `worker/`: Background service that performs health checks
- `shared/`: Shared models, utilities, and database client
- `migrations/`: Database schema management
- `scripts/`: Setup and maintenance utilities

### Running Tests
```bash
# Run all tests
npm test

# Run API tests
npm run test:api

# Run worker tests
npm run test:worker
```

### Database Migrations
```bash
# Create new migration
npm run migrate:create add_alert_channels

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, questions, or feature requests:
- Open an issue on GitHub
- Check the detailed setup guide in `setup_guide.md`

---

**Note**: This is a self-hosted monitoring solution. Ensure you comply with applicable laws and regulations when monitoring third-party services.
