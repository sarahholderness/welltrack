# WellTrack API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via JWT Bearer token. Include the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh token to obtain a new access token.

---

## Health Check

### GET /health

Check if the API is running.

**Authentication:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Authentication:** None

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | 8-100 characters |
| displayName | string | No | 1-100 characters |

**Example Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe"
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "timezone": "UTC",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Error Responses:**
- `400` - Validation failed
- `409` - Email already registered

---

### POST /auth/login

Authenticate and receive tokens.

**Authentication:** None

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | User's password |

**Example Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "timezone": "UTC",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Error Responses:**
- `400` - Validation failed
- `401` - Invalid email or password

---

### POST /auth/refresh

Get new tokens using a refresh token.

**Authentication:** None

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | Yes | Valid refresh token |

**Example Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Success Response (200):**
```json
{
  "accessToken": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

**Error Responses:**
- `400` - Validation failed
- `401` - Invalid or expired refresh token

---

### POST /auth/logout

Log out (client should discard tokens).

**Authentication:** None

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/forgot-password

Request a password reset token.

**Authentication:** None

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |

**Success Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

*Note: The reset token is logged to the console in development. In production, it would be sent via email.*

---

### POST /auth/reset-password

Reset password using a reset token.

**Authentication:** None

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Password reset token |
| password | string | Yes | New password (8-100 characters) |

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400` - Invalid or expired reset token / Validation failed

---

## User Endpoints

### GET /users/me

Get the authenticated user's profile.

**Authentication:** Required

**Success Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "timezone": "UTC",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### PATCH /users/me

Update the authenticated user's profile.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| displayName | string | No | 1-100 characters |
| timezone | string | No | Valid timezone (e.g., "America/New_York") |

**Success Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Updated Name",
  "timezone": "America/New_York",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### DELETE /users/me

Delete the authenticated user's account and all data.

**Authentication:** Required

**Success Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Symptom Endpoints

### GET /symptoms

Get all symptoms (system defaults + user's custom symptoms).

**Authentication:** Required

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Headache",
    "category": "pain",
    "isActive": true,
    "userId": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### POST /symptoms

Create a custom symptom.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 1-100 characters |
| category | string | No | Category name |

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "Custom Symptom",
  "category": "custom",
  "isActive": true,
  "userId": "user_uuid",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### PATCH /symptoms/:id

Update a custom symptom (cannot modify system defaults).

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | 1-100 characters |
| category | string | No | Category name (use `null` to clear) |
| isActive | boolean | No | Whether symptom is active |

**Error Responses:**
- `403` - Cannot modify system default symptoms or other users' symptoms
- `404` - Symptom not found

---

### DELETE /symptoms/:id

Delete a custom symptom (cannot delete system defaults).

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete system default symptoms or other users' symptoms
- `404` - Symptom not found

---

## Symptom Log Endpoints

### GET /symptom-logs

Get symptom logs with optional filtering and pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO datetime | - | Filter logs from this date |
| endDate | ISO datetime | - | Filter logs until this date |
| symptomId | UUID | - | Filter by specific symptom |
| page | integer | 1 | Page number (min: 1) |
| limit | integer | 20 | Items per page (1-100) |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "symptomId": "symptom_uuid",
      "severity": 7,
      "notes": "After lunch",
      "loggedAt": "2024-01-15T12:30:00.000Z",
      "createdAt": "2024-01-15T12:35:00.000Z",
      "symptom": {
        "id": "symptom_uuid",
        "name": "Headache",
        "category": "pain"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### POST /symptom-logs

Create a symptom log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| symptomId | UUID | Yes | ID of the symptom |
| severity | integer | Yes | 1-10 scale |
| notes | string | No | Up to 1000 characters |
| loggedAt | ISO datetime | No | Defaults to current time |

**Success Response (201):**
```json
{
  "id": "uuid",
  "symptomId": "symptom_uuid",
  "severity": 7,
  "notes": "After lunch",
  "loggedAt": "2024-01-15T12:30:00.000Z",
  "createdAt": "2024-01-15T12:35:00.000Z",
  "symptom": {
    "id": "symptom_uuid",
    "name": "Headache",
    "category": "pain"
  }
}
```

**Error Responses:**
- `403` - Cannot log another user's custom symptom
- `404` - Symptom not found

---

### PATCH /symptom-logs/:id

Update a symptom log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| severity | integer | No | 1-10 scale |
| notes | string/null | No | Up to 1000 characters (use `null` to clear) |
| loggedAt | ISO datetime | No | When the symptom occurred |

**Error Responses:**
- `403` - Cannot modify another user's log
- `404` - Log not found

---

### DELETE /symptom-logs/:id

Delete a symptom log.

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete another user's log
- `404` - Log not found

---

## Mood Log Endpoints

### GET /mood-logs

Get mood logs with optional filtering and pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO datetime | - | Filter logs from this date |
| endDate | ISO datetime | - | Filter logs until this date |
| page | integer | 1 | Page number (min: 1) |
| limit | integer | 20 | Items per page (1-100) |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "moodScore": 4,
      "energyLevel": 3,
      "stressLevel": 2,
      "notes": "Good day overall",
      "loggedAt": "2024-01-15T18:00:00.000Z",
      "createdAt": "2024-01-15T18:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2
  }
}
```

---

### POST /mood-logs

Create a mood log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| moodScore | integer | Yes | 1-5 scale |
| energyLevel | integer | No | 1-5 scale |
| stressLevel | integer | No | 1-5 scale |
| notes | string | No | Up to 1000 characters |
| loggedAt | ISO datetime | No | Defaults to current time |

**Success Response (201):**
```json
{
  "id": "uuid",
  "moodScore": 4,
  "energyLevel": 3,
  "stressLevel": 2,
  "notes": "Good day overall",
  "loggedAt": "2024-01-15T18:00:00.000Z",
  "createdAt": "2024-01-15T18:05:00.000Z"
}
```

---

### PATCH /mood-logs/:id

Update a mood log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| moodScore | integer | No | 1-5 scale |
| energyLevel | integer/null | No | 1-5 scale (use `null` to clear) |
| stressLevel | integer/null | No | 1-5 scale (use `null` to clear) |
| notes | string/null | No | Up to 1000 characters (use `null` to clear) |
| loggedAt | ISO datetime | No | When the mood was logged |

**Error Responses:**
- `403` - Cannot modify another user's log
- `404` - Log not found

---

### DELETE /mood-logs/:id

Delete a mood log.

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete another user's log
- `404` - Log not found

---

## Medication Endpoints

### GET /medications

Get all medications for the authenticated user.

**Authentication:** Required

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Ibuprofen",
    "dosage": "400mg",
    "frequency": "As needed",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### POST /medications

Create a new medication.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 1-100 characters |
| dosage | string | No | Up to 100 characters |
| frequency | string | No | Up to 100 characters |

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "Ibuprofen",
  "dosage": "400mg",
  "frequency": "As needed",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### PATCH /medications/:id

Update a medication.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | 1-100 characters |
| dosage | string/null | No | Up to 100 characters (use `null` to clear) |
| frequency | string/null | No | Up to 100 characters (use `null` to clear) |
| isActive | boolean | No | Whether medication is active |

**Error Responses:**
- `403` - Cannot modify another user's medication
- `404` - Medication not found

---

### DELETE /medications/:id

Delete a medication.

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete another user's medication
- `404` - Medication not found

---

## Medication Log Endpoints

### GET /medication-logs

Get medication logs with optional filtering and pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO datetime | - | Filter logs from this date |
| endDate | ISO datetime | - | Filter logs until this date |
| medicationId | UUID | - | Filter by specific medication |
| page | integer | 1 | Page number (min: 1) |
| limit | integer | 20 | Items per page (1-100) |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "medicationId": "medication_uuid",
      "taken": true,
      "takenAt": "2024-01-15T08:00:00.000Z",
      "notes": "With breakfast",
      "createdAt": "2024-01-15T08:05:00.000Z",
      "medication": {
        "id": "medication_uuid",
        "name": "Ibuprofen",
        "dosage": "400mg"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 60,
    "totalPages": 3
  }
}
```

---

### POST /medication-logs

Create a medication log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| medicationId | UUID | Yes | ID of the medication |
| taken | boolean | Yes | Whether medication was taken |
| takenAt | ISO datetime | No | When medication was taken |
| notes | string | No | Up to 1000 characters |

**Success Response (201):**
```json
{
  "id": "uuid",
  "medicationId": "medication_uuid",
  "taken": true,
  "takenAt": "2024-01-15T08:00:00.000Z",
  "notes": "With breakfast",
  "createdAt": "2024-01-15T08:05:00.000Z",
  "medication": {
    "id": "medication_uuid",
    "name": "Ibuprofen",
    "dosage": "400mg"
  }
}
```

**Error Responses:**
- `403` - Cannot log another user's medication
- `404` - Medication not found

---

### PATCH /medication-logs/:id

Update a medication log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| taken | boolean | No | Whether medication was taken |
| takenAt | ISO datetime/null | No | When medication was taken (use `null` to clear) |
| notes | string/null | No | Up to 1000 characters (use `null` to clear) |

**Error Responses:**
- `403` - Cannot modify another user's log
- `404` - Log not found

---

### DELETE /medication-logs/:id

Delete a medication log.

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete another user's log
- `404` - Log not found

---

## Habit Endpoints

### GET /habits

Get all habits (system defaults + user's custom habits).

**Authentication:** Required

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Sleep Duration",
    "trackingType": "duration",
    "unit": "hours",
    "isActive": true,
    "userId": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "uuid",
    "name": "Exercise",
    "trackingType": "boolean",
    "unit": null,
    "isActive": true,
    "userId": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### POST /habits

Create a custom habit.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 1-100 characters |
| trackingType | enum | Yes | `boolean`, `numeric`, or `duration` |
| unit | string | No | Up to 50 characters (e.g., "glasses", "minutes") |

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "Meditation",
  "trackingType": "duration",
  "unit": "minutes",
  "isActive": true,
  "userId": "user_uuid",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

### PATCH /habits/:id

Update a custom habit (cannot modify system defaults).

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | 1-100 characters |
| trackingType | enum | No | `boolean`, `numeric`, or `duration` |
| unit | string/null | No | Up to 50 characters (use `null` to clear) |
| isActive | boolean | No | Whether habit is active |

**Error Responses:**
- `403` - Cannot modify system default habits or other users' habits
- `404` - Habit not found

---

### DELETE /habits/:id

Delete a custom habit (cannot delete system defaults).

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete system default habits or other users' habits
- `404` - Habit not found

---

## Habit Log Endpoints

### GET /habit-logs

Get habit logs with optional filtering and pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO datetime | - | Filter logs from this date |
| endDate | ISO datetime | - | Filter logs until this date |
| habitId | UUID | - | Filter by specific habit |
| page | integer | 1 | Page number (min: 1) |
| limit | integer | 20 | Items per page (1-100) |

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "habitId": "habit_uuid",
      "valueBoolean": null,
      "valueNumeric": null,
      "valueDuration": 480,
      "notes": "Good night's sleep",
      "loggedAt": "2024-01-15T07:00:00.000Z",
      "createdAt": "2024-01-15T07:05:00.000Z",
      "habit": {
        "id": "habit_uuid",
        "name": "Sleep Duration",
        "trackingType": "duration",
        "unit": "minutes"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### POST /habit-logs

Create a habit log. The value field depends on the habit's tracking type:
- `boolean` habits require `valueBoolean`
- `numeric` habits require `valueNumeric`
- `duration` habits require `valueDuration`

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| habitId | UUID | Yes | ID of the habit |
| valueBoolean | boolean | Conditional | Required for boolean habits |
| valueNumeric | number | Conditional | Required for numeric habits |
| valueDuration | integer | Conditional | Required for duration habits (minutes, non-negative) |
| notes | string | No | Up to 1000 characters |
| loggedAt | ISO datetime | No | Defaults to current time |

**Example Request (boolean habit):**
```json
{
  "habitId": "uuid",
  "valueBoolean": true
}
```

**Example Request (numeric habit):**
```json
{
  "habitId": "uuid",
  "valueNumeric": 8,
  "notes": "Drank 8 glasses of water"
}
```

**Example Request (duration habit):**
```json
{
  "habitId": "uuid",
  "valueDuration": 480,
  "notes": "8 hours of sleep"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "habitId": "habit_uuid",
  "valueBoolean": null,
  "valueNumeric": null,
  "valueDuration": 480,
  "notes": "8 hours of sleep",
  "loggedAt": "2024-01-15T07:00:00.000Z",
  "createdAt": "2024-01-15T07:05:00.000Z",
  "habit": {
    "id": "habit_uuid",
    "name": "Sleep Duration",
    "trackingType": "duration",
    "unit": "minutes"
  }
}
```

**Error Responses:**
- `400` - Missing required value field for habit's tracking type
- `403` - Cannot log another user's custom habit
- `404` - Habit not found

---

### PATCH /habit-logs/:id

Update a habit log.

**Authentication:** Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| valueBoolean | boolean/null | No | For boolean habits |
| valueNumeric | number/null | No | For numeric habits |
| valueDuration | integer/null | No | For duration habits (non-negative) |
| notes | string/null | No | Up to 1000 characters (use `null` to clear) |
| loggedAt | ISO datetime | No | When the habit was logged |

**Error Responses:**
- `403` - Cannot modify another user's log
- `404` - Log not found

---

### DELETE /habit-logs/:id

Delete a habit log.

**Authentication:** Required

**Error Responses:**
- `403` - Cannot delete another user's log
- `404` - Log not found

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message"
}
```

Validation errors include details:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (access denied) |
| 404 | Not Found |
| 409 | Conflict (e.g., email already exists) |
| 500 | Internal Server Error |
