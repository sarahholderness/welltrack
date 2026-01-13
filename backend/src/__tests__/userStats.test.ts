import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('GET /api/stats', () => {
  let accessToken: string;
  let userId: string;
  let symptomId: string;

  const testUser = {
    email: 'statstest@example.com',
    password: 'password123',
    displayName: 'Stats Test User',
  };

  beforeEach(async () => {
    await cleanupTestUsers();

    // Clean up test data
    await prisma.symptomLog.deleteMany({});
    await prisma.moodLog.deleteMany({});
    await prisma.medicationLog.deleteMany({});
    await prisma.habitLog.deleteMany({});

    // Register a user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;

    // Create a test symptom
    const symptom = await prisma.symptom.create({
      data: {
        name: 'Test Headache',
        userId,
        isActive: true,
      },
    });
    symptomId = symptom.id;
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.symptomLog.deleteMany({});
    await prisma.moodLog.deleteMany({});
    await prisma.medicationLog.deleteMany({});
    await prisma.habitLog.deleteMany({});
    await disconnectDb();
  });

  it('should return stats structure with empty data', async () => {
    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toBeDefined();
    expect(response.body.stats.averageMoodScore).toBeNull();
    expect(response.body.stats.topSymptoms).toEqual([]);
    expect(response.body.stats.currentStreak).toBe(0);
    expect(response.body.stats.totalLogs).toEqual({
      symptoms: 0,
      moods: 0,
      medications: 0,
      habits: 0,
    });
  });

  it('should calculate average mood score for last 30 days', async () => {
    // Create mood logs within last 30 days
    const now = new Date();
    await prisma.moodLog.createMany({
      data: [
        { userId, moodScore: 3, loggedAt: now },
        { userId, moodScore: 4, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) },
        { userId, moodScore: 5, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) },
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.averageMoodScore).toBe(4); // (3+4+5)/3 = 4
    expect(response.body.stats.totalLogs.moods).toBe(3);
  });

  it('should exclude mood logs older than 30 days from average', async () => {
    const now = new Date();
    const thirtyFiveDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 35);

    await prisma.moodLog.createMany({
      data: [
        { userId, moodScore: 5, loggedAt: now }, // included
        { userId, moodScore: 1, loggedAt: thirtyFiveDaysAgo }, // excluded from average
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.averageMoodScore).toBe(5); // Only recent log counts
    expect(response.body.stats.totalLogs.moods).toBe(2); // But total includes all
  });

  it('should return top symptoms sorted by frequency', async () => {
    const now = new Date();

    // Create another symptom
    const symptom2 = await prisma.symptom.create({
      data: { name: 'Test Fatigue', userId, isActive: true },
    });

    // Log headache 3 times, fatigue 1 time
    await prisma.symptomLog.createMany({
      data: [
        { userId, symptomId, severity: 5, loggedAt: now },
        { userId, symptomId, severity: 6, loggedAt: new Date(now.getTime() - 1000 * 60 * 60) },
        { userId, symptomId, severity: 4, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2) },
        { userId, symptomId: symptom2.id, severity: 3, loggedAt: now },
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.topSymptoms.length).toBe(2);
    expect(response.body.stats.topSymptoms[0].symptomName).toBe('Test Headache');
    expect(response.body.stats.topSymptoms[0].count).toBe(3);
    expect(response.body.stats.topSymptoms[1].symptomName).toBe('Test Fatigue');
    expect(response.body.stats.topSymptoms[1].count).toBe(1);
  });

  it('should limit top symptoms to 5', async () => {
    const now = new Date();

    // Create 6 symptoms and log each once
    for (let i = 0; i < 6; i++) {
      const symptom = await prisma.symptom.create({
        data: { name: `Symptom ${i}`, userId, isActive: true },
      });
      await prisma.symptomLog.create({
        data: { userId, symptomId: symptom.id, severity: 5, loggedAt: now },
      });
    }

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.topSymptoms.length).toBe(5);
  });

  it('should calculate current streak for consecutive days', async () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    // Create logs for today and 2 previous days (3-day streak)
    await prisma.moodLog.createMany({
      data: [
        { userId, moodScore: 4, loggedAt: now },
        { userId, moodScore: 3, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) },
        { userId, moodScore: 5, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) },
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.currentStreak).toBe(3);
  });

  it('should break streak on missing day', async () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);

    // Create logs for today and 3 days ago (skipping yesterday and day before)
    await prisma.moodLog.createMany({
      data: [
        { userId, moodScore: 4, loggedAt: now },
        { userId, moodScore: 5, loggedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) },
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.currentStreak).toBe(1); // Only today counts
  });

  it('should count all log types in total', async () => {
    const now = new Date();

    // Create a medication and habit for logging
    const medication = await prisma.medication.create({
      data: { userId, name: 'Test Med', isActive: true },
    });
    const habit = await prisma.habit.create({
      data: { userId, name: 'Test Habit', trackingType: 'boolean', isActive: true },
    });

    // Create various logs
    await prisma.symptomLog.create({
      data: { userId, symptomId, severity: 5, loggedAt: now },
    });
    await prisma.moodLog.createMany({
      data: [
        { userId, moodScore: 4, loggedAt: now },
        { userId, moodScore: 3, loggedAt: now },
      ],
    });
    await prisma.medicationLog.create({
      data: { userId, medicationId: medication.id, taken: true },
    });
    await prisma.habitLog.createMany({
      data: [
        { userId, habitId: habit.id, valueBoolean: true, loggedAt: now },
        { userId, habitId: habit.id, valueBoolean: true, loggedAt: now },
        { userId, habitId: habit.id, valueBoolean: false, loggedAt: now },
      ],
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.totalLogs).toEqual({
      symptoms: 1,
      moods: 2,
      medications: 1,
      habits: 3,
    });
  });

  it('should not include other users logs', async () => {
    // Create another user with logs
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `statsother-${Date.now()}@example.com`,
        password: 'password123',
      });
    const otherUserId = otherUserResponse.body.user.id;

    // Create logs for other user
    await prisma.moodLog.create({
      data: { userId: otherUserId, moodScore: 1, loggedAt: new Date() },
    });

    // Create log for test user
    await prisma.moodLog.create({
      data: { userId, moodScore: 5, loggedAt: new Date() },
    });

    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.averageMoodScore).toBe(5); // Only our user's log
    expect(response.body.stats.totalLogs.moods).toBe(1);
  });

  it('should return 401 without token', async () => {
    const response = await request(app).get('/api/stats');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No token provided');
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/stats')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid or expired token');
  });
});
