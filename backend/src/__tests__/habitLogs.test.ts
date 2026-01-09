import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

describe('Habit Log Endpoints', () => {
  let authToken: string;
  let userId: string;
  let booleanHabitId: string;
  let numericHabitId: string;
  let durationHabitId: string;
  const testEmail = `habitlog-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Register and login a test user
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      displayName: 'Habit Log Test User',
    });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create test habits for each tracking type
    const booleanHabit = await prisma.habit.create({
      data: { userId, name: 'Test Boolean Habit', trackingType: 'boolean' },
    });
    booleanHabitId = booleanHabit.id;

    const numericHabit = await prisma.habit.create({
      data: { userId, name: 'Test Numeric Habit', trackingType: 'numeric', unit: 'glasses' },
    });
    numericHabitId = numericHabit.id;

    const durationHabit = await prisma.habit.create({
      data: { userId, name: 'Test Duration Habit', trackingType: 'duration', unit: 'minutes' },
    });
    durationHabitId = durationHabit.id;
  });

  afterAll(async () => {
    // Clean up test user and their data
    if (userId) {
      await prisma.habitLog.deleteMany({ where: { userId } });
      await prisma.habit.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('POST /api/habit-logs', () => {
    afterEach(async () => {
      await prisma.habitLog.deleteMany({ where: { userId } });
    });

    it('should create a boolean habit log', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: booleanHabitId,
          valueBoolean: true,
          notes: 'Completed today',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        habitId: booleanHabitId,
        valueBoolean: true,
        valueNumeric: null,
        valueDuration: null,
        notes: 'Completed today',
        userId,
      });
      expect(response.body.log.habit.name).toBe('Test Boolean Habit');
      expect(response.body.log.habit.trackingType).toBe('boolean');
    });

    it('should create a numeric habit log', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: numericHabitId,
          valueNumeric: 8,
          notes: 'Drank 8 glasses',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        habitId: numericHabitId,
        valueBoolean: null,
        valueNumeric: 8,
        valueDuration: null,
        notes: 'Drank 8 glasses',
      });
      expect(response.body.log.habit.unit).toBe('glasses');
    });

    it('should create a duration habit log', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: durationHabitId,
          valueDuration: 45,
          notes: '45 minutes of reading',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        habitId: durationHabitId,
        valueBoolean: null,
        valueNumeric: null,
        valueDuration: 45,
      });
    });

    it('should create log with custom loggedAt', async () => {
      const customDate = '2024-01-15T08:00:00.000Z';
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: booleanHabitId,
          valueBoolean: true,
          loggedAt: customDate,
        });

      expect(response.status).toBe(201);
      expect(response.body.log.loggedAt).toBe(customDate);
    });

    it('should allow logging system default habits', async () => {
      // Get a system default habit
      const systemHabit = await prisma.habit.findFirst({
        where: { userId: null },
      });

      if (!systemHabit) {
        return; // Skip if no system defaults exist
      }

      const value =
        systemHabit.trackingType === 'boolean'
          ? { valueBoolean: true }
          : systemHabit.trackingType === 'numeric'
            ? { valueNumeric: 5 }
            : { valueDuration: 30 };

      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: systemHabit.id,
          ...value,
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 for missing valueBoolean on boolean habit', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: booleanHabitId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('valueBoolean is required for boolean habits');
    });

    it('should return 400 for missing valueNumeric on numeric habit', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: numericHabitId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('valueNumeric is required for numeric habits');
    });

    it('should return 400 for missing valueDuration on duration habit', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: durationHabitId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('valueDuration is required for duration habits');
    });

    it('should return 404 for non-existent habit', async () => {
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: '00000000-0000-0000-0000-000000000000',
          valueBoolean: true,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit not found');
    });

    it('should return 403 when logging another user\'s custom habit', async () => {
      // Create another user with a habit
      const otherEmail = `habitlog-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit for other user
      const otherHabit = await prisma.habit.create({
        data: { userId: otherUserId, name: 'Other User Habit', trackingType: 'boolean' },
      });

      // Try to log with original user
      const response = await request(app)
        .post('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          habitId: otherHabit.id,
          valueBoolean: true,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot log another user's habit");

      // Clean up
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/habit-logs').send({
        habitId: booleanHabitId,
        valueBoolean: true,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/habit-logs', () => {
    beforeAll(async () => {
      // Create some logs for testing
      await prisma.habitLog.createMany({
        data: [
          {
            userId,
            habitId: booleanHabitId,
            valueBoolean: true,
            loggedAt: new Date('2024-01-15T08:00:00Z'),
          },
          {
            userId,
            habitId: numericHabitId,
            valueNumeric: 6,
            loggedAt: new Date('2024-01-16T08:00:00Z'),
          },
          {
            userId,
            habitId: durationHabitId,
            valueDuration: 30,
            loggedAt: new Date('2024-01-17T08:00:00Z'),
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.habitLog.deleteMany({ where: { userId } });
    });

    it('should return all logs for user', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(3);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('should return logs ordered by loggedAt descending', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const dates = response.body.logs.map((log: { loggedAt: string }) =>
        new Date(log.loggedAt).getTime()
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .query({
          startDate: '2024-01-15T00:00:00.000Z',
          endDate: '2024-01-16T23:59:59.000Z',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(2);
    });

    it('should filter by habitId', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .query({ habitId: booleanHabitId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.logs[0].habitId).toBe(booleanHabitId);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('should return second page', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should include habit details', async () => {
      const response = await request(app)
        .get('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const boolLog = response.body.logs.find(
        (log: { habitId: string }) => log.habitId === booleanHabitId
      );
      expect(boolLog.habit).toMatchObject({
        id: booleanHabitId,
        name: 'Test Boolean Habit',
        trackingType: 'boolean',
      });
    });

    it('should not return other users\' logs', async () => {
      // Create another user with a log
      const otherEmail = `habitlog-getother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit and log for other user
      const otherHabit = await prisma.habit.create({
        data: { userId: otherUserId, name: 'Other Habit', trackingType: 'boolean' },
      });
      await prisma.habitLog.create({
        data: {
          userId: otherUserId,
          habitId: otherHabit.id,
          valueBoolean: true,
          loggedAt: new Date(),
        },
      });

      // Original user should not see other user's logs
      const response = await request(app)
        .get('/api/habit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.logs.forEach((log: { userId: string }) => {
        expect(log.userId).toBe(userId);
      });

      // Clean up
      await prisma.habitLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/habit-logs');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/habit-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.habitLog.create({
        data: {
          userId,
          habitId: booleanHabitId,
          valueBoolean: true,
          notes: 'Original notes',
          loggedAt: new Date('2024-01-15T08:00:00Z'),
        },
      });
      logId = log.id;
    });

    afterEach(async () => {
      await prisma.habitLog.deleteMany({ where: { userId } });
    });

    it('should update valueBoolean', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ valueBoolean: false });

      expect(response.status).toBe(200);
      expect(response.body.log.valueBoolean).toBe(false);
    });

    it('should update notes', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBe('Updated notes');
    });

    it('should clear notes with null', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: null });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBeNull();
    });

    it('should update loggedAt', async () => {
      const newDate = '2024-01-20T10:00:00.000Z';
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ loggedAt: newDate });

      expect(response.status).toBe(200);
      expect(response.body.log.loggedAt).toBe(newDate);
    });

    it('should include habit details in response', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.log.habit).toMatchObject({
        id: booleanHabitId,
        name: 'Test Boolean Habit',
      });
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .patch('/api/habit-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ valueBoolean: false });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit log not found');
    });

    it('should return 403 when modifying another user\'s log', async () => {
      // Create another user with a log
      const otherEmail = `habitlog-patchother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit and log for other user
      const otherHabit = await prisma.habit.create({
        data: { userId: otherUserId, name: 'Other Habit', trackingType: 'boolean' },
      });
      const otherLog = await prisma.habitLog.create({
        data: {
          userId: otherUserId,
          habitId: otherHabit.id,
          valueBoolean: true,
          loggedAt: new Date(),
        },
      });

      // Try to update with original user
      const response = await request(app)
        .patch(`/api/habit-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ valueBoolean: false });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot modify another user's log");

      // Clean up
      await prisma.habitLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch(`/api/habit-logs/${logId}`)
        .send({ valueBoolean: false });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/habit-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.habitLog.create({
        data: {
          userId,
          habitId: booleanHabitId,
          valueBoolean: true,
          loggedAt: new Date(),
        },
      });
      logId = log.id;
    });

    afterEach(async () => {
      await prisma.habitLog.deleteMany({ where: { userId } });
    });

    it('should delete log', async () => {
      const response = await request(app)
        .delete(`/api/habit-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Habit log deleted successfully');

      // Verify deletion
      const log = await prisma.habitLog.findUnique({
        where: { id: logId },
      });
      expect(log).toBeNull();
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .delete('/api/habit-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit log not found');
    });

    it('should return 403 when deleting another user\'s log', async () => {
      // Create another user with a log
      const otherEmail = `habitlog-deleteother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit and log for other user
      const otherHabit = await prisma.habit.create({
        data: { userId: otherUserId, name: 'Other Habit', trackingType: 'boolean' },
      });
      const otherLog = await prisma.habitLog.create({
        data: {
          userId: otherUserId,
          habitId: otherHabit.id,
          valueBoolean: true,
          loggedAt: new Date(),
        },
      });

      // Try to delete with original user
      const response = await request(app)
        .delete(`/api/habit-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot delete another user's log");

      // Clean up
      await prisma.habitLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/habit-logs/${logId}`);

      expect(response.status).toBe(401);
    });
  });
});
