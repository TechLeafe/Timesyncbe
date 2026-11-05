# Time Sync Backend

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` in `.env` to your MongoDB connection string. The example uses a local MongoDB instance; for MongoDB Atlas, use the connection string from your Atlas cluster.
4. Replace `JWT_SECRET` with a long, random secret.
5. Start the development server with `npm run dev`.

The server requires `MONGODB_URI` (or the legacy `MONGO_URI`) before it starts listening. Keep `.env` private; it is excluded from Git.

Attendance finalization is scheduled for 10:00 PM Asia/Kolkata. If the backend
process is suspended while its host sleeps, it cannot execute at that exact
time; it catches up on startup, the next minute-level scheduler check, or the
next attendance history/cron-status request. The cron-status response reports
whether the last run was scheduled or a recovery run.