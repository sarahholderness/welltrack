import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

describe('Medication Log Endpoints', () => {
  let authToken: string;
  let userId: string;
  let medicationId: string;
  const testEmail = `medlog-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Register and login a test user
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      displayName: 'Medication Log Test User',
    });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create a medication for testing
    const medication = await prisma.medication.create({
      data: {
        userId,
        name: 'Test Medication',
        dosage: '50mg',
        frequency: 'daily',
      },
    });
    medicationId = medication.id;
  });

  afterAll(async () => {
    // Clean up test user and their data
    if (userId) {
      await prisma.medicationLog.deleteMany({ where: { userId } });
      await prisma.medication.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('POST /api/medication-logs', () => {
    afterEach(async () => {
      await prisma.medicationLog.deleteMany({ where: { userId } });
    });

    it('should create a medication log with taken=true', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId,
          taken: true,
          takenAt: '2024-01-15T08:00:00.000Z',
          notes: 'Took with breakfast',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        medicationId,
        taken: true,
        notes: 'Took with breakfast',
        userId,
      });
      expect(response.body.log.takenAt).toBe('2024-01-15T08:00:00.000Z');
      expect(response.body.log.medication.name).toBe('Test Medication');
    });

    it('should create a medication log with taken=false', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId,
          taken: false,
          notes: 'Forgot to take it',
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        medicationId,
        taken: false,
        takenAt: null,
        notes: 'Forgot to take it',
      });
    });

    it('should create a medication log without optional fields', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId,
          taken: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.log).toMatchObject({
        medicationId,
        taken: true,
        takenAt: null,
        notes: null,
      });
    });

    it('should return 400 for missing medicationId', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taken: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing taken field', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid medicationId format', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId: 'not-a-uuid',
          taken: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 for non-existent medication', async () => {
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId: '00000000-0000-0000-0000-000000000000',
          taken: true,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Medication not found');
    });

    it('should return 403 when logging another user\'s medication', async () => {
      // Create another user with a medication
      const otherEmail = `medlog-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create medication for other user
      const otherMedication = await prisma.medication.create({
        data: {
          userId: otherUserId,
          name: 'Other Medication',
          dosage: '10mg',
        },
      });

      // Try to log with original user
      const response = await request(app)
        .post('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicationId: otherMedication.id,
          taken: true,
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot log another user's medication");

      // Clean up
      await prisma.medication.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/medication-logs').send({
        medicationId,
        taken: true,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/medication-logs', () => {
    beforeAll(async () => {
      // Create some logs for testing
      await prisma.medicationLog.createMany({
        data: [
          {
            userId,
            medicationId,
            taken: true,
            takenAt: new Date('2024-01-15T08:00:00Z'),
            createdAt: new Date('2024-01-15T08:00:00Z'),
          },
          {
            userId,
            medicationId,
            taken: true,
            takenAt: new Date('2024-01-16T08:00:00Z'),
            createdAt: new Date('2024-01-16T08:00:00Z'),
          },
          {
            userId,
            medicationId,
            taken: false,
            notes: 'Skipped',
            createdAt: new Date('2024-01-17T08:00:00Z'),
          },
        ],
      });
    });

    afterAll(async () => {
      await prisma.medicationLog.deleteMany({ where: { userId } });
    });

    it('should return all logs for user', async () => {
      const response = await request(app)
        .get('/api/medication-logs')
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

    it('should return logs ordered by createdAt descending', async () => {
      const response = await request(app)
        .get('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const dates = response.body.logs.map((log: { createdAt: string }) =>
        new Date(log.createdAt).getTime()
      );
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/medication-logs')
        .query({
          startDate: '2024-01-15T00:00:00.000Z',
          endDate: '2024-01-16T23:59:59.000Z',
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(2);
    });

    it('should filter by medicationId', async () => {
      // Create another medication and log
      const otherMed = await prisma.medication.create({
        data: { userId, name: 'Other Med' },
      });
      await prisma.medicationLog.create({
        data: {
          userId,
          medicationId: otherMed.id,
          taken: true,
        },
      });

      const response = await request(app)
        .get('/api/medication-logs')
        .query({ medicationId })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(3);
      response.body.logs.forEach((log: { medicationId: string }) => {
        expect(log.medicationId).toBe(medicationId);
      });

      // Clean up
      await prisma.medicationLog.deleteMany({ where: { medicationId: otherMed.id } });
      await prisma.medication.delete({ where: { id: otherMed.id } });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/medication-logs')
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
        .get('/api/medication-logs')
        .query({ page: 2, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should include medication details', async () => {
      const response = await request(app)
        .get('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.logs[0].medication).toMatchObject({
        id: medicationId,
        name: 'Test Medication',
        dosage: '50mg',
        frequency: 'daily',
      });
    });

    it('should not return other users\' logs', async () => {
      // Create another user with a log
      const otherEmail = `medlog-getother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create medication and log for other user
      const otherMed = await prisma.medication.create({
        data: { userId: otherUserId, name: 'Other Med' },
      });
      await prisma.medicationLog.create({
        data: {
          userId: otherUserId,
          medicationId: otherMed.id,
          taken: true,
        },
      });

      // Original user should not see other user's logs
      const response = await request(app)
        .get('/api/medication-logs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.logs.forEach((log: { userId: string }) => {
        expect(log.userId).toBe(userId);
      });

      // Clean up
      await prisma.medicationLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.medication.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/medication-logs');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/medication-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.medicationLog.create({
        data: {
          userId,
          medicationId,
          taken: true,
          takenAt: new Date('2024-01-15T08:00:00Z'),
          notes: 'Original notes',
        },
      });
      logId = log.id;
    });

    afterEach(async () => {
      await prisma.medicationLog.deleteMany({ where: { userId } });
    });

    it('should update taken field', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taken: false });

      expect(response.status).toBe(200);
      expect(response.body.log.taken).toBe(false);
    });

    it('should update takenAt field', async () => {
      const newTime = '2024-01-15T12:00:00.000Z';
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ takenAt: newTime });

      expect(response.status).toBe(200);
      expect(response.body.log.takenAt).toBe(newTime);
    });

    it('should update notes field', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBe('Updated notes');
    });

    it('should clear takenAt with null', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ takenAt: null });

      expect(response.status).toBe(200);
      expect(response.body.log.takenAt).toBeNull();
    });

    it('should clear notes with null', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: null });

      expect(response.status).toBe(200);
      expect(response.body.log.notes).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taken: false,
          takenAt: null,
          notes: 'Decided not to take it',
        });

      expect(response.status).toBe(200);
      expect(response.body.log).toMatchObject({
        taken: false,
        takenAt: null,
        notes: 'Decided not to take it',
      });
    });

    it('should include medication details in response', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.log.medication).toMatchObject({
        id: medicationId,
        name: 'Test Medication',
      });
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .patch('/api/medication-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taken: false });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Medication log not found');
    });

    it('should return 403 when modifying another user\'s log', async () => {
      // Create another user with a log
      const otherEmail = `medlog-patchother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create medication and log for other user
      const otherMed = await prisma.medication.create({
        data: { userId: otherUserId, name: 'Other Med' },
      });
      const otherLog = await prisma.medicationLog.create({
        data: {
          userId: otherUserId,
          medicationId: otherMed.id,
          taken: true,
        },
      });

      // Try to update with original user
      const response = await request(app)
        .patch(`/api/medication-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taken: false });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot modify another user's log");

      // Clean up
      await prisma.medicationLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.medication.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch(`/api/medication-logs/${logId}`)
        .send({ taken: false });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/medication-logs/:id', () => {
    let logId: string;

    beforeEach(async () => {
      const log = await prisma.medicationLog.create({
        data: {
          userId,
          medicationId,
          taken: true,
        },
      });
      logId = log.id;
    });

    afterEach(async () => {
      await prisma.medicationLog.deleteMany({ where: { userId } });
    });

    it('should delete log', async () => {
      const response = await request(app)
        .delete(`/api/medication-logs/${logId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Medication log deleted successfully');

      // Verify deletion
      const log = await prisma.medicationLog.findUnique({
        where: { id: logId },
      });
      expect(log).toBeNull();
    });

    it('should return 404 for non-existent log', async () => {
      const response = await request(app)
        .delete('/api/medication-logs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Medication log not found');
    });

    it('should return 403 when deleting another user\'s log', async () => {
      // Create another user with a log
      const otherEmail = `medlog-deleteother-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create medication and log for other user
      const otherMed = await prisma.medication.create({
        data: { userId: otherUserId, name: 'Other Med' },
      });
      const otherLog = await prisma.medicationLog.create({
        data: {
          userId: otherUserId,
          medicationId: otherMed.id,
          taken: true,
        },
      });

      // Try to delete with original user
      const response = await request(app)
        .delete(`/api/medication-logs/${otherLog.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot delete another user's log");

      // Clean up
      await prisma.medicationLog.deleteMany({ where: { userId: otherUserId } });
      await prisma.medication.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/medication-logs/${logId}`);

      expect(response.status).toBe(401);
    });
  });
});
