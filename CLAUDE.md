# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WellTrack is a symptom and wellness tracking application for people with chronic health conditions. Users can log symptoms, moods, medications, and daily habits, then view trends to identify patterns.

## Tech Stack

- **Frontend:** React with TypeScript, Tailwind CSS (not yet implemented)
- **Backend:** Node.js + Express with TypeScript
- **Database:** PostgreSQL with Prisma ORM (planned)
- **Auth:** JWT with refresh tokens (planned)
- **Validation:** Zod

## Commands

All commands run from the `backend/` directory:

```bash
# Development
npm run dev          # Start dev server with hot reload (ts-node-dev)

# Build
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled code from dist/

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Running a Single Test

```bash
npm test -- --testPathPattern="health"    # Run tests matching "health"
npm test -- src/__tests__/app.test.ts     # Run specific test file
```

## Architecture

### Backend Structure

```
backend/src/
├── index.ts        # Server entry point (loads env, starts server)
├── app.ts          # Express app configuration (middleware, routes, error handlers)
├── routes/         # Route handlers
├── controllers/    # Request handlers (planned)
├── services/       # Business logic (planned)
├── middleware/     # Custom middleware (planned)
└── utils/          # Shared utilities (planned)
```

### Frontend Structure
- Pages: `/frontend/src/pages/` — Route components
- Components: `/frontend/src/components/` — Reusable UI components
- Hooks: `/frontend/src/hooks/` — Custom React hooks
- Services: `/frontend/src/services/` — API client functions


### Key Patterns

- **App/Server separation:** `app.ts` exports the Express app for testing; `index.ts` handles server startup
- **Tests location:** Tests live in `src/__tests__/` using `.test.ts` suffix
- **Environment:** Uses dotenv; create `.env` file (not committed)

## API Endpoints

Base URL: `/api`

Current:
- `GET /api/health` - Health check

Planned (see [Documents/Requirements.md](Documents/Requirements.md)):
- Auth: `/api/auth/*`
- Users: `/api/users/*`
- Symptoms/Logs: `/api/symptoms/*`, `/api/symptom-logs/*`
- Moods: `/api/mood-logs/*`
- Medications: `/api/medications/*`, `/api/medication-logs/*`
- Habits: `/api/habits/*`, `/api/habit-logs/*`
- Insights: `/api/insights/*`, `/api/export/*`

## Data Model

See [Documents/Requirements.md](Documents/Requirements.md) for complete schema. Key entities:
- User (with timezone support)
- Symptom / SymptomLog (severity 1-10)
- MoodLog (mood/energy/stress 1-5)
- Medication / MedicationLog
- Habit / HabitLog (boolean, numeric, or duration tracking)


## Git Workflow
When completing tasks from TASKS.md:
1. Create a new branch named `feature/<task-number>-<brief-description>` before starting work
2. Make atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - test: for tests
   - refactor: for refactoring
3. After completing a task, create a pull request with:
   - A descriptive title matching the task
   - A summary of changes made
   - Any testing notes or considerations
4. Update the task checkbox in TASKS.md to mark it complete

## Testing Requirements
Before marking any task as complete:
1. Write unit tests for new functionality
2. Run the full test suite with: `npm test`
3. If tests fail:
 - Analyze the failure output
 - Fix the code (no the tests, unless tests are incorrect)
 - Re-run tests until all pass
4. For API endpoints, include integration tests that verify:
 - Success responses with valid input
 - Authentication requirements
 - Edge cases
## Test Commands
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Run specific test file: `npm test -- path/to/test.ts`
- Run test matching pattern: `npm test -- --grep "pattern"`