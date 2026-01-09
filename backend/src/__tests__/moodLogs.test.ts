import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('Mood Log Endpoints', () => {
  let accessToken: string;
  let userId: string;
  const testUser = {
    email: 'moodlogtest@example.com',
    password: 'password123',
    displayName: 'Mood Log Test User',
  };

  beforeEach(async () => {
    await cleanupTestUsers();
    // Clean up any test mood logs
    await prisma.moodLog.deleteMany({});

    // Register a user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.moodLog.deleteMany({});
    await disconnectDb();
  });

  describe('POST /api/mood-logs', () => {
    it('should create a mood log with all fields', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          moodScore: 4,
          energyLevel: 3,
          stressLevel: 2,
          notes: 'Feeling good today',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toBeDefined();
      expect(response.body.log.moodScore).toBe(4);
      expect(response.body.log.energyLevel).toBe(3);
      expect(response.body.log.stressLevel).toBe(2);
      expect(response.body.log.notes).toBe('Feeling good today');
      expect(response.body.log.userId).toBe(userId);
    });

    it('should create log with only moodScore', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 3 });

      expect(response.status).toBe(201);
      expect(response.body.log.moodScore).toBe(3);
      expect(response.body.log.energyLevel).toBeNull();
      expect(response.body.log.stressLevel).toBeNull();
      expect(response.body.log.notes).toBeNull();
    });

    it('should create log with custom loggedAt', async () => {
      const customDate = '2024-01-15T10:30:00.000Z';
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          moodScore: 5,
          loggedAt: customDate,
        });

      expect(response.status).toBe(201);
      expect(new Date(response.body.log.loggedAt).toISOString()).toBe(customDate);
    });

    it('should return 400 for missing moodScore', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ energyLevel: 3 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for moodScore below 1', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for moodScore above 5', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for energyLevel out of range', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 3, energyLevel: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for stressLevel out of range', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 3, stressLevel: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/mood-logs')
        .send({ moodScore: 3 });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/mood-logs', () => {
    beforeEach(async () => {
      // Create some test logs
      const dates = [
        '2024-01-10T10:00:00.000Z',
        '2024-01-11T10:00:00.000Z',
        '2024-01-12T10:00:00.000Z',
        '2024-01-13T10:00:00.000Z',
        '2024-01-14T10:00:00.000Z',
      ];

      for (let i = 0; i < dates.length; i++) {
        await prisma.moodLog.create({
          data: {
            userId,
            moodScore: i + 1,
            energyLevel: i + 1,
            stressLevel: 5 - i,
            loggedAt: new Date(dates[i]),
          },
        });
      }
    });

    it('should return all logs for user', async () => {
      const response = await request(app)
        .get('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
      expect(response.body.logs.length).toBe(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(5);
    });

    it('should return logs ordered by loggedAt descending', async () => {
      const response = await request(app)
        .get('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const logs = response.body.logs;
      // Most recent first (moodScore 5 was logged on Jan 14)
      expect(logs[0].moodScore).toBe(5);
      expect(logs[4].moodScore).toBe(1);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/mood-logs')
        .query({
          startDate: '2024-01-11T00:00:00.000Z',
          endDate: '2024-01-13T23:59:59.999Z',
        })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(3);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/mood-logs')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('should return second page', async () => {
      const response = await request(app)
        .get('/api/mood-logs')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(2);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should not return other users\' logs', async () => {
      // Create another user with logs
      const uniqueEmail = `moodlog-getother-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });
      const otherAccessToken = otherUserResponse.body.accessToken;

      // Create log as other user
      await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ moodScore: 1 });

      // Get logs as original user
      const response = await request(app)
        .get('/api/mood-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Should only see original user's 5 logs
      expect(response.body.logs.length).toBe(5);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/mood-logs');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/mood-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.moodLog.create({
        data: {
          userId,
          moodScore: 3,
          energyLevel: 3,
          stressLevel: 3,
          notes: 'Original notes',
          loggedAt: new Date('2024-01-15T10:00:00.000Z'),
        },
      });
      logId = log.id;
    });

    it('should update moodScore', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 5 });

      expect(response.status).toBe(200);
      expect(response.body.log.moodScore).toBe(5);
      expect(response.body.log.energyLevel).toBe(3);
    });

    it('should update energyLevel', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ energyLevel: 5 });

      expect(response.status).toBe(200);
      expect(response.body.log.energyLevel).toBe(5);
    });

    it('should update stressLevel', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ stressLevel: 1 });

      expect(response.status).toBe(200);
      expect(response.body.log.stressLevel).toBe(1);
    });

    it('should update notes', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBe('Updated notes');
    });

    it('should clear optional fields with null', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ energyLevel: null, stressLevel: null, notes: null });

      expect(response.status).toBe(200);
      expect(response.body.log.energyLevel).toBeNull();
      expect(response.body.log.stressLevel).toBeNull();
      expect(response.body.log.notes).toBeNull();
    });

    it('should update loggedAt', async () => {
      const newDate = '2024-02-01T15:00:00.000Z';
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ loggedAt: newDate });

      expect(response.status).toBe(200);
      expect(new Date(response.body.log.loggedAt).toISOString()).toBe(newDate);
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .patch('/api/mood-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 5 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Mood log not found');
    });

    it('should return 403 when modifying another user\'s log', async () => {
      // Create another user with a log
      const uniqueEmail = `moodlog-patchother-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(otherUserResponse.status).toBe(201);
      const otherAccessToken = otherUserResponse.body.accessToken;

      const otherLogResponse = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ moodScore: 2 });

      expect(otherLogResponse.status).toBe(201);
      const otherLogId = otherLogResponse.body.log.id;

      // Try to update with original user
      const response = await request(app)
        .patch(`/api/mood-logs/${otherLogId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ moodScore: 5 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify another user\'s log');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/mood-logs/${logId}`)
        .send({ moodScore: 5 });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/mood-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.moodLog.create({
        data: {
          userId,
          moodScore: 3,
          loggedAt: new Date(),
        },
      });
      logId = log.id;
    });

    it('should delete log', async () => {
      const response = await request(app)
        .delete(`/api/mood-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Mood log deleted successfully');

      // Verify deletion
      const deleted = await prisma.moodLog.findUnique({
        where: { id: logId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .delete('/api/mood-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Mood log not found');
    });

    it('should return 403 when deleting another user\'s log', async () => {
      // Create another user with a log
      const uniqueEmail = `moodlog-deleteother-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(otherUserResponse.status).toBe(201);
      const otherAccessToken = otherUserResponse.body.accessToken;

      const otherLogResponse = await request(app)
        .post('/api/mood-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ moodScore: 2 });

      expect(otherLogResponse.status).toBe(201);
      const otherLogId = otherLogResponse.body.log.id;

      // Try to delete with original user
      const response = await request(app)
        .delete(`/api/mood-logs/${otherLogId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete another user\'s log');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete(`/api/mood-logs/${logId}`);

      expect(response.status).toBe(401);
    });
  });
});
