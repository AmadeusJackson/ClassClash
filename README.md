# ClassClash Backend API

REST API backend for ClassClash productivity app built with Node.js, Express, and SQLite.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
- Copy `.env.example` to `.env` (already created)
- Update `JWT_SECRET` with a secure random string for production

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
  - Body: `{ username, email, password }`
  - Returns: `{ token, user }`

- `POST /api/auth/login` - Login
  - Body: `{ username, password }` (username can be email)
  - Returns: `{ token, user }`

- `GET /api/auth/me` - Get current user (requires auth token)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user }`

### Classes (`/api/classes`)
- `GET /api/classes` - Get all user's classes (requires auth)
- `POST /api/classes` - Create new class (requires auth)
  - Body: `{ name }`
- `GET /api/classes/:id` - Get specific class (requires auth)

### Study Sessions (`/api/sessions`)
- `POST /api/sessions` - Record study session (requires auth)
  - Body: `{ classId, seconds, weekStart? }`
- `GET /api/sessions/weekly/:classId` - Get weekly total for class (requires auth)
  - Query: `?weekStart=YYYY-MM-DD` (optional)
- `GET /api/sessions/weekly` - Get weekly totals for all classes (requires auth)
  - Query: `?weekStart=YYYY-MM-DD` (optional)

### Leaderboard (`/api/leaderboard`)
- `GET /api/leaderboard/:classId` - Get leaderboard for a class (public)
  - Query: `?weekStart=YYYY-MM-DD` (optional, defaults to current week)

### Feedback (`/api/feedback`)
- `GET /api/feedback` - Get all feedback (public, sorted by upvotes)
- `POST /api/feedback` - Create feedback (requires auth)
  - Body: `{ content }`
- `POST /api/feedback/:id/upvote` - Toggle upvote (requires auth)
- `DELETE /api/feedback/:id` - Delete own feedback (requires auth)

## Database

SQLite database file is created automatically at `./classclash.db` (or path specified in `DB_PATH` env var).

Tables:
- `users` - User accounts
- `classes` - User's classes
- `study_sessions` - Recorded study time
- `feedback` - User feedback
- `feedback_upvotes` - Upvote tracking

## Authentication

Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Tokens expire after 7 days.

## CORS

CORS is enabled for all origins. For production, configure specific origins in `server.js`.
