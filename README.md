# Project Management App

A modern, full-stack project management application built with React, TypeScript, and Node.js. The application helps teams manage projects, track time, and collaborate effectively.

## 🚀 Features

- Project and task management
- Time tracking and logging
- User authentication and authorization
- Email notifications
- Modern, responsive UI built with Material-UI
- Interactive scheduling with DevExpress Scheduler
- Data visualization with Recharts

## 🛠️ Tech Stack

### Frontend

- React 19
- TypeScript
- Material-UI (MUI) v6
- DevExpress Scheduler
- Recharts for data visualization
- React Router for navigation
- Axios for API calls

### Backend

- Node.js
- TypeScript
- PostgreSQL 18
- Docker for containerization

### Services

- Notification service
- Email service (SMTP integration)

## 📦 Project Structure

```bash
project_management_app/
├── api/               # Backend API service
├── fe/                # Frontend React application
├── db/                # Database migrations and data
├── notification-service/ # Notification handling service
└── docker-compose.yml # Docker composition file
```

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)

### Installation

1. Clone the repository
2. Create a `.env` file based on the provided example
3. Start the application using Docker:

```bash
docker compose up -d
```

On Linux, make the backup directory writable by the `backup` service first: `mkdir -p db/backup && sudo chown 70:70 db/backup`.

The application will be available at <http://localhost:3000> (the API is proxied under `/api`).

## 💻 Development

### Frontend Development

```bash
cd fe
npm install
npm start
```

### Backend Development

```bash
cd api
npm install
npm run dev
```

## 🔒 Environment Variables

Key environment variables needed (see [.env.example](.env.example)):

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Database and its owner (used only for migrations and backups)
- `APP_DB_PASSWORD` (required), `APP_DB_USER` (default `pm_app`): Non-superuser role the api and notification service connect as
- `ADMIN_PASSWORD`: Password of the default `admin` user, created on first start
- `BACKUP_TIME`: Daily backup time, `HH:MM` in `TZ` (default `00:00`)
- `SESSION_SECRET`: Session encryption key
- `EMAIL_USER`, `EMAIL_PASSWORD`: SMTP credentials. Host, port, TLS, sender address and the enable switch live in Settings > System Settings and are stored in the database
- `METRICS_ENABLED`: Set to `true` to make the notification service log counters (sent, errors, dead-lettered) every 30s (default off)
- `NODE_ENV`: Environment (development/production)

## 🐳 Docker

[docker-compose.yml](docker-compose.yml) runs one image as several services:

- `db`: PostgreSQL (no port exposed to the host)
- `migrate`: one-shot; applies `db/init`, creates the app role and seeds the admin, then exits
- `api`: Express API
- `notifications`: notification/email service
- `web`: nginx serving the frontend and proxying `/api` to `api` (port 3000)
- `backup`: daily `pg_dump` into `./db/backup`

## 🧪 Running integration tests locally

Requires **Docker**. Env for tests lives in **api/.env.test** (not in package.json).

From the **api** directory:

```bash
cd api
cp .env.test.example .env.test   # then edit .env.test if needed
yarn setup-test-db
yarn test:integration:local
```

- **setup-test-db**: Starts a Postgres container (`pm_test_db`) on port **5433** and runs `db/migrate.sh` in it (schema, app role `pm_app`).
- **test:integration:local**: Loads **.env.test** and runs integration tests (no env vars in package.json).

To run tests with custom env: set `TEST_DB_*` and `SESSION_SECRET` in `.env.test`, or run `yarn test:integration` with env set in your shell.

## Database migrations, backups and admin seed

See [db/README.md](db/README.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
