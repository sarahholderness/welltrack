import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import symptomsRouter from './routes/symptoms';
import symptomLogsRouter from './routes/symptomLogs';
import moodLogsRouter from './routes/moodLogs';
import medicationsRouter from './routes/medications';
import medicationLogsRouter from './routes/medicationLogs';
import habitsRouter from './routes/habits';
import habitLogsRouter from './routes/habitLogs';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/symptoms', symptomsRouter);
app.use('/api/symptom-logs', symptomLogsRouter);
app.use('/api/mood-logs', moodLogsRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/medication-logs', medicationLogsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/habit-logs', habitLogsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
