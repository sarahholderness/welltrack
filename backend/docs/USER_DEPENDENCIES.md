# User Model Dependency Chain

This document shows the complete dependency chain for the User model - everything that imports or uses User directly or indirectly.

---

## Model Definition

**File:** `prisma/schema.prisma`

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  displayName  String?
  timezone     String    @default("UTC")
  createdAt    DateTime  @default(now())

  // Relations (8 related entities)
  symptoms              Symptom[]
  symptomLogs           SymptomLog[]
  moodLogs              MoodLog[]
  medications           Medication[]
  medicationLogs        MedicationLog[]
  habits                Habit[]
  habitLogs             HabitLog[]
  passwordResetTokens   PasswordResetToken[]
}
```

---

## Dependency Tree

```
User Model (prisma/schema.prisma)
│
├── Backend Prisma Client
│   └── src/lib/prisma.ts (singleton instance)
│
├── Direct User Operations
│   ├── src/routes/users.ts
│   │   ├── GET /api/users/me
│   │   ├── PATCH /api/users/me
│   │   └── DELETE /api/users/me
│   │
│   └── src/routes/auth.ts
│       ├── POST /api/auth/register → prisma.user.create()
│       ├── POST /api/auth/login → prisma.user.findUnique()
│       ├── POST /api/auth/refresh
│       ├── POST /api/auth/forgot-password
│       └── POST /api/auth/reset-password
│
├── User Context in Middleware
│   ├── src/middleware/auth.ts
│   │   └── authMiddleware (extracts userId from JWT)
│   │
│   └── src/utils/jwt.ts
│       └── TokenPayload { userId, email }
│
├── Indirect Dependencies (via req.user.userId)
│   ├── src/routes/symptoms.ts
│   ├── src/routes/symptomLogs.ts
│   ├── src/routes/moodLogs.ts
│   ├── src/routes/medications.ts
│   ├── src/routes/medicationLogs.ts
│   ├── src/routes/habits.ts
│   └── src/routes/habitLogs.ts
│
├── Validators
│   └── src/validators/user.ts
│       └── updateUserSchema (displayName, timezone)
│
├── Frontend Type System
│   └── frontend/src/types/index.ts
│       └── User interface
│
├── Frontend Services
│   ├── frontend/src/services/auth.ts
│   │   ├── register() → returns User
│   │   ├── login() → returns User
│   │   └── getCurrentUser() → returns User
│   │
│   └── frontend/src/context/AuthContext.tsx
│       ├── Manages User state
│       └── Provides useAuth() hook
│
└── Tests
    ├── src/__tests__/auth.test.ts
    ├── src/__tests__/users.test.ts
    ├── src/__tests__/symptomLogs.test.ts
    ├── src/__tests__/moodLogs.test.ts
    ├── src/__tests__/habits.test.ts
    ├── src/__tests__/medications.test.ts
    └── src/__tests__/helpers/testDb.ts
```

---

## Backend Files

### Direct User Operations

| File | Operations | Description |
|------|------------|-------------|
| `src/lib/prisma.ts` | PrismaClient | Singleton providing access to User model |
| `src/routes/auth.ts` | create, findUnique | Registration, login, password reset |
| `src/routes/users.ts` | findUnique, update, delete | Profile management |
| `src/middleware/auth.ts` | - | Extracts userId from JWT, attaches to request |
| `src/utils/jwt.ts` | - | TokenPayload contains userId and email |
| `src/validators/user.ts` | - | Zod schema for user updates |

### Indirect Dependencies (via userId foreign key)

These routes filter all queries by `req.user.userId`:

| File | Related Model |
|------|---------------|
| `src/routes/symptoms.ts` | Symptom |
| `src/routes/symptomLogs.ts` | SymptomLog |
| `src/routes/moodLogs.ts` | MoodLog |
| `src/routes/medications.ts` | Medication |
| `src/routes/medicationLogs.ts` | MedicationLog |
| `src/routes/habits.ts` | Habit |
| `src/routes/habitLogs.ts` | HabitLog |

---

## Frontend Files

| File | Usage |
|------|-------|
| `src/types/index.ts` | Defines User interface (id, email, displayName, timezone, createdAt) |
| `src/services/auth.ts` | API calls that return User data |
| `src/context/AuthContext.tsx` | Manages User state, provides useAuth() hook |

---

## Related Database Models

All have foreign key to User with cascade delete:

| Model | Relationship | On Delete |
|-------|--------------|-----------|
| PasswordResetToken | Required (userId) | Cascade |
| Symptom | Optional (userId nullable) | Cascade |
| SymptomLog | Required (userId) | Cascade |
| MoodLog | Required (userId) | Cascade |
| Medication | Required (userId) | Cascade |
| MedicationLog | Required (userId) | Cascade |
| Habit | Optional (userId nullable) | Cascade |
| HabitLog | Required (userId) | Cascade |

---

## Test Files

| File | Tests |
|------|-------|
| `src/__tests__/auth.test.ts` | User registration, login |
| `src/__tests__/users.test.ts` | Profile CRUD operations |
| `src/__tests__/symptomLogs.test.ts` | User's symptom logs |
| `src/__tests__/moodLogs.test.ts` | User's mood logs |
| `src/__tests__/habits.test.ts` | User's habits |
| `src/__tests__/medications.test.ts` | User's medications |
| `src/__tests__/helpers/testDb.ts` | cleanupTestUsers() helper |

---

## Impact Analysis

### If you modify User model fields, update:

1. **Database** → `prisma/schema.prisma` + run migration
2. **Backend Routes** → `src/routes/auth.ts`, `src/routes/users.ts`
3. **Validators** → `src/validators/user.ts`
4. **JWT** → `src/utils/jwt.ts` (if auth-related fields change)
5. **Frontend Types** → `frontend/src/types/index.ts`
6. **Frontend Context** → `frontend/src/context/AuthContext.tsx`
7. **Tests** → All auth and user tests

### Cascade Effects

- Deleting a User automatically deletes all related data (8 entities)
- Changing User.id format breaks all foreign key relationships
- Changing email uniqueness affects registration logic

---

## Statistics

| Category | Count |
|----------|-------|
| Total files referencing User | 21 |
| Direct Prisma User queries | 3 route files |
| Indirect dependencies (via userId) | 7 route files |
| Frontend files | 3 |
| Test files | 7 |
| Related database entities | 8 |
