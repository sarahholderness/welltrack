import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('Symptom Log Endpoints', () => {
  let accessToken: string;
  let userId: string;
  let symptomId: string;
  const testUser = {
    email: 'symptomlogtest@example.com',
    password: 'password123',
    displayName: 'Symptom Log Test User',
  };

  beforeEach(async () => {
    await cleanupTestUsers();
    // Clean up any test symptom logs
    await prisma.symptomLog.deleteMany({});

    // Register a user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;

    // Get a system default symptom to use for logging
    const symptom = await prisma.symptom.findFirst({
      where: { userId: null },
    });
    symptomId = symptom!.id;
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.symptomLog.deleteMany({});
    await disconnectDb();
  });

  describe('POST /api/symptom-logs', () => {
    it('should create a symptom log', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId,
          severity: 7,
          notes: 'Feeling bad today',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toBeDefined();
      expect(response.body.log.severity).toBe(7);
      expect(response.body.log.notes).toBe('Feeling bad today');
      expect(response.body.log.userId).toBe(userId);
      expect(response.body.log.symptom).toBeDefined();
      expect(response.body.log.symptom.id).toBe(symptomId);
    });

    it('should create log with custom loggedAt', async () => {
      const customDate = '2024-01-15T10:30:00.000Z';
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId,
          severity: 5,
          loggedAt: customDate,
        });

      expect(response.status).toBe(201);
      expect(new Date(response.body.log.loggedAt).toISOString()).toBe(customDate);
    });

    it('should create log without notes', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId,
          severity: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.log.notes).toBeNull();
    });

    it('should return 400 for invalid severity (too low)', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId,
          severity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid severity (too high)', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId,
          severity: 11,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 for non-existent symptom', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId: '00000000-0000-0000-0000-000000000000',
          severity: 5,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Symptom not found');
    });

    it('should return 403 when logging another user\'s custom symptom', async () => {
      // Create another user with a custom symptom
      const uniqueEmail = `symptomlog-other-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(otherUserResponse.status).toBe(201);
      const otherAccessToken = otherUserResponse.body.accessToken;

      // Create custom symptom for other user
      const symptomResponse = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Other User Custom Symptom' });

      expect(symptomResponse.status).toBe(201);
      const otherSymptomId = symptomResponse.body.symptom.id;

      // Try to log with original user
      const response = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          symptomId: otherSymptomId,
          severity: 5,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot log another user\'s symptom');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/symptom-logs')
        .send({
          symptomId,
          severity: 5,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/symptom-logs', () => {
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
        await prisma.symptomLog.create({
          data: {
            userId,
            symptomId,
            severity: i + 1,
            loggedAt: new Date(dates[i]),
          },
        });
      }
    });

    it('should return all logs for user', async () => {
      const response = await request(app)
        .get('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
      expect(response.body.logs.length).toBe(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(5);
    });

    it('should return logs ordered by loggedAt descending', async () => {
      const response = await request(app)
        .get('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const logs = response.body.logs;
      // Most recent first
      expect(logs[0].severity).toBe(5); // Jan 14
      expect(logs[4].severity).toBe(1); // Jan 10
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/symptom-logs')
        .query({
          startDate: '2024-01-11T00:00:00.000Z',
          endDate: '2024-01-13T23:59:59.999Z',
        })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(3);
    });

    it('should filter by symptomId', async () => {
      // Create a custom symptom and log to it
      const symptomResponse = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Filter Test Symptom' });
      const customSymptomId = symptomResponse.body.symptom.id;

      await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ symptomId: customSymptomId, severity: 8 });

      const response = await request(app)
        .get('/api/symptom-logs')
        .query({ symptomId: customSymptomId })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(1);
      expect(response.body.logs[0].symptomId).toBe(customSymptomId);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/symptom-logs')
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
        .get('/api/symptom-logs')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBe(2);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should not return other users\' logs', async () => {
      // Create another user with logs
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'symptomlog-getother@example.com',
          password: 'password123',
        });
      const otherAccessToken = otherUserResponse.body.accessToken;

      // Create log as other user
      await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ symptomId, severity: 9 });

      // Get logs as original user
      const response = await request(app)
        .get('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Should only see original user's 5 logs
      expect(response.body.logs.length).toBe(5);
    });

    it('should include symptom details', async () => {
      const response = await request(app)
        .get('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs[0].symptom).toBeDefined();
      expect(response.body.logs[0].symptom.name).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/symptom-logs');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/symptom-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.symptomLog.create({
        data: {
          userId,
          symptomId,
          severity: 5,
          notes: 'Original notes',
          loggedAt: new Date('2024-01-15T10:00:00.000Z'),
        },
      });
      logId = log.id;
    });

    it('should update severity', async () => {
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ severity: 8 });

      expect(response.status).toBe(200);
      expect(response.body.log.severity).toBe(8);
      expect(response.body.log.notes).toBe('Original notes');
    });

    it('should update notes', async () => {
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBe('Updated notes');
    });

    it('should clear notes with null', async () => {
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: null });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBeNull();
    });

    it('should update loggedAt', async () => {
      const newDate = '2024-02-01T15:00:00.000Z';
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ loggedAt: newDate });

      expect(response.status).toBe(200);
      expect(new Date(response.body.log.loggedAt).toISOString()).toBe(newDate);
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .patch('/api/symptom-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ severity: 5 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Symptom log not found');
    });

    it('should return 403 when modifying another user\'s log', async () => {
      // Create another user with a log
      const uniqueEmail = `symptomlog-patchother-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(otherUserResponse.status).toBe(201);
      const otherAccessToken = otherUserResponse.body.accessToken;

      const otherLogResponse = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ symptomId, severity: 3 });

      expect(otherLogResponse.status).toBe(201);
      const otherLogId = otherLogResponse.body.log.id;

      // Try to update with original user
      const response = await request(app)
        .patch(`/api/symptom-logs/${otherLogId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ severity: 10 });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify another user\'s log');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/symptom-logs/${logId}`)
        .send({ severity: 5 });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/symptom-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.symptomLog.create({
        data: {
          userId,
          symptomId,
          severity: 5,
          loggedAt: new Date(),
        },
      });
      logId = log.id;
    });

    it('should delete log', async () => {
      const response = await request(app)
        .delete(`/api/symptom-logs/${logId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Symptom log deleted successfully');

      // Verify deletion
      const deleted = await prisma.symptomLog.findUnique({
        where: { id: logId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .delete('/api/symptom-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Symptom log not found');
    });

    it('should return 403 when deleting another user\'s log', async () => {
      // Create another user with a log
      const uniqueEmail = `symptomlog-deleteother-${Date.now()}@example.com`;
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      expect(otherUserResponse.status).toBe(201);
      const otherAccessToken = otherUserResponse.body.accessToken;

      const otherLogResponse = await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ symptomId, severity: 3 });

      expect(otherLogResponse.status).toBe(201);
      const otherLogId = otherLogResponse.body.log.id;

      // Try to delete with original user
      const response = await request(app)
        .delete(`/api/symptom-logs/${otherLogId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete another user\'s log');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete(`/api/symptom-logs/${logId}`);

      expect(response.status).toBe(401);
    });
  });
});
