# WellTrack Authentication Flow Documentation

This document traces how a login request flows from the route handler through to the database and back to the response.

---

## Files Involved

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Route Handler | `src/routes/auth.ts` | Receives login request, orchestrates flow |
| Input Validation | `src/validators/auth.ts` | Validates email/password format with Zod |
| Password Utility | `src/utils/password.ts` | Bcrypt password verification |
| JWT Utility | `src/utils/jwt.ts` | Token generation and verification |
| Database Client | `src/lib/prisma.ts` | Prisma ORM client singleton |
| Auth Middleware | `src/middleware/auth.ts` | Protects routes, validates tokens |
| App Setup | `src/app.ts` | Express app configuration, route mounting |
| Server Entry | `src/index.ts` | Loads env, starts server |

---

## Complete Login Flow (Step-by-Step)

### Step 1: Client Request
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Step 2: Route Matching (`app.ts`)
```typescript
app.use('/api/auth', authRouter);
```
Request is routed to the auth router.

### Step 3: Login Handler (`routes/auth.ts`)

```typescript
router.post('/login', async (req, res, next) => {
  // 1. Validate input with Zod
  const data = loginSchema.parse(req.body);

  // 2. Look up user in database
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  // 3. Check if user exists
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 4. Verify password
  const isValidPassword = await verifyPassword(data.password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 5. Generate tokens
  const tokens = generateTokens({ userId: user.id, email: user.email });

  // 6. Return response
  res.json({
    user: formatUserResponse(user),
    ...tokens
  });
});
```

### Step 4: Input Validation (`validators/auth.ts`)
```typescript
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
```
- Validates email format
- Ensures password is not empty
- Throws `ZodError` if validation fails

### Step 5: Database Lookup (`lib/prisma.ts`)
```typescript
const user = await prisma.user.findUnique({
  where: { email: data.email },
});
```
Returns user object with: `id`, `email`, `passwordHash`, `displayName`, `timezone`, `createdAt`

### Step 6: Password Verification (`utils/password.ts`)
```typescript
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```
- Uses bcrypt for secure comparison
- Returns `true` if password matches hash

### Step 7: Token Generation (`utils/jwt.ts`)
```typescript
export function generateTokens(payload: TokenPayload) {
  return {
    accessToken: generateAccessToken(payload),   // 15 min expiry
    refreshToken: generateRefreshToken(payload), // 7 day expiry
  };
}
```

**Token Configuration:**
- Access Token: 15 minutes, signed with `JWT_SECRET`
- Refresh Token: 7 days, signed with `JWT_REFRESH_SECRET`
- Payload: `{ userId, email }`

### Step 8: Response Formatting (`routes/auth.ts`)
```typescript
function formatUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    createdAt: user.createdAt,
  };
}
```
Excludes `passwordHash` from response.

---

## Response Structures

### Successful Login (200 OK)
```json
{
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "displayName": "John Doe",
    "timezone": "UTC",
    "createdAt": "2026-01-10T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Validation Error (400 Bad Request)
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

### Invalid Credentials (401 Unauthorized)
```json
{
  "error": "Invalid email or password"
}
```

---

## Auth Middleware for Protected Routes (`middleware/auth.ts`)

```typescript
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 1. Check for Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // 2. Extract token
  const token = authHeader.substring(7);

  // 3. Verify token
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;  // Attach to request
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Usage on protected routes:**
```typescript
router.use(authMiddleware);  // All routes below require auth

router.get('/me', (req, res) => {
  // Access user via req.user.userId
});
```

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT                                       │
│  POST /api/auth/login { email, password }                           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  app.ts                                                              │
│  app.use('/api/auth', authRouter)                                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  routes/auth.ts - POST /login                                        │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  Zod Schema  │───▶│   Prisma     │───▶│   bcrypt     │          │
│  │  Validation  │    │   findUnique │    │   compare    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  validators/auth.ts   lib/prisma.ts      utils/password.ts         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                  utils/jwt.ts                         │          │
│  │  generateTokens({ userId, email })                    │          │
│  │  ├── accessToken (15 min)                            │          │
│  │  └── refreshToken (7 days)                           │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
│  formatUserResponse(user) → excludes passwordHash                   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT                                       │
│  Receives: { user, accessToken, refreshToken }                      │
│  Stores tokens for future authenticated requests                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security Notes

1. **Password never stored in plaintext** - bcrypt with 10 salt rounds
2. **Generic error messages** - "Invalid email or password" prevents email enumeration
3. **Dual token system** - Short-lived access token + long-lived refresh token
4. **Sensitive data excluded** - `passwordHash` never returned in responses
5. **Separate secrets** - Different secrets for access vs refresh tokens

---

## Related Test File

`src/__tests__/auth.test.ts` contains tests for:
- Successful login
- Wrong password (401)
- Non-existent user (401)
- Missing fields (400)
