# WellTrack

Symptom and wellness tracking app for people with chronic health conditions.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL) or local PostgreSQL

### 1. Clone and Install

```bash
git clone https://github.com/sarahholderness/welltrack.git
cd welltrack

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Setup

Start PostgreSQL with Docker:
```bash
cd backend
docker compose up -d
```

Run migrations and seed data:
```bash
npm run db:migrate
npm run db:seed
```

### 3. Environment Variables

**Backend** (`backend/.env`):
```
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/welltrack?schema=public"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="another-secret-key-min-32-chars"
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. Run Development Servers

Backend (runs on port 3000):
```bash
cd backend
npm run dev
```

Frontend (runs on port 5173):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Available Scripts

### Backend (`cd backend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled code |
| `npm test` | Run tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed default data |
| `npm run db:studio` | Open Prisma Studio |

### Frontend (`cd frontend`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## API Documentation

See [backend/docs/API.md](backend/docs/API.md) for full API reference.

## Project Structure

```
welltrack/
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── middleware/# Auth, validation
│   │   └── utils/     # Helpers
│   └── prisma/        # Database schema & migrations
├── frontend/          # React + TypeScript
│   └── src/
│       ├── pages/     # Route components
│       ├── components/# UI components
│       ├── hooks/     # Custom hooks
│       └── services/  # API client
└── Documents/         # Requirements & task tracking
```
