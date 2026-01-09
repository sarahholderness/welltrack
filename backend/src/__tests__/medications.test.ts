import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

describe('Medication Endpoints', () => {
  let authToken: string;
  let userId: string;
  const testEmail = `medication-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Register and login a test user
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      displayName: 'Medication Test User',
    });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test user and their data
    if (userId) {
      await prisma.medicationLog.deleteMany({ where: { userId } });
      await prisma.medication.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('GET /api/medications', () => {
    it('should return empty array when user has no medications', async () => {
      const response = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.medications).toEqual([]);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/medications');

      expect(response.status).toBe(401);
    });

    it('should return user medications sorted by active status and name', async () => {
      // Create some medications
      await prisma.medication.createMany({
        data: [
          { userId, name: 'Zoloft', dosage: '50mg', frequency: 'daily', isActive: true },
          { userId, name: 'Aspirin', dosage: '100mg', frequency: 'as needed', isActive: true },
          { userId, name: 'OldMed', dosage: '10mg', frequency: 'daily', isActive: false },
        ],
      });

      const response = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.medications).toHaveLength(3);
      // Active medications first, then sorted by name
      expect(response.body.medications[0].name).toBe('Aspirin');
      expect(response.body.medications[0].isActive).toBe(true);
      expect(response.body.medications[1].name).toBe('Zoloft');
      expect(response.body.medications[1].isActive).toBe(true);
      expect(response.body.medications[2].name).toBe('OldMed');
      expect(response.body.medications[2].isActive).toBe(false);

      // Clean up
      await prisma.medication.deleteMany({ where: { userId } });
    });

    it('should not return medications from other users', async () => {
      // Create another user
      const otherEmail = `medication-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create medication for other user
      await prisma.medication.create({
        data: { userId: otherUserId, name: 'OtherMed', dosage: '5mg', frequency: 'daily' },
      });

      // Create medication for test user
      await prisma.medication.create({
        data: { userId, name: 'MyMed', dosage: '10mg', frequency: 'daily' },
      });

      const response = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.medications).toHaveLength(1);
      expect(response.body.medications[0].name).toBe('MyMed');

      // Clean up
      await prisma.medication.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
      await prisma.medication.deleteMany({ where: { userId } });
    });
  });

  describe('POST /api/medications', () => {
    it('should create a medication with all fields', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'once daily',
        });

      expect(response.status).toBe(201);
      expect(response.body.medication).toMatchObject({
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'once daily',
        isActive: true,
        userId,
      });
      expect(response.body.medication.id).toBeDefined();

      // Clean up
      await prisma.medication.delete({ where: { id: response.body.medication.id } });
    });

    it('should create a medication with only name', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Vitamin D',
        });

      expect(response.status).toBe(201);
      expect(response.body.medication).toMatchObject({
        name: 'Vitamin D',
        dosage: null,
        frequency: null,
        isActive: true,
      });

      // Clean up
      await prisma.medication.delete({ where: { id: response.body.medication.id } });
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dosage: '10mg',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });

    it('should return 400 when name is empty', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when name exceeds max length', async () => {
      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A'.repeat(101),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/medications').send({
        name: 'Test Med',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/medications/:id', () => {
    let medicationId: string;

    beforeEach(async () => {
      const medication = await prisma.medication.create({
        data: { userId, name: 'UpdateTest', dosage: '5mg', frequency: 'daily' },
      });
      medicationId = medication.id;
    });

    afterEach(async () => {
      await prisma.medication.deleteMany({ where: { userId } });
    });

    it('should update medication name', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'UpdatedName' });

      expect(response.status).toBe(200);
      expect(response.body.medication.name).toBe('UpdatedName');
      expect(response.body.medication.dosage).toBe('5mg'); // unchanged
    });

    it('should update medication dosage', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dosage: '10mg' });

      expect(response.status).toBe(200);
      expect(response.body.medication.dosage).toBe('10mg');
    });

    it('should update medication frequency', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ frequency: 'twice daily' });

      expect(response.status).toBe(200);
      expect(response.body.medication.frequency).toBe('twice daily');
    });

    it('should update medication isActive status', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.medication.isActive).toBe(false);
    });

    it('should set dosage to null', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dosage: null });

      expect(response.status).toBe(200);
      expect(response.body.medication.dosage).toBeNull();
    });

    it('should set frequency to null', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ frequency: null });

      expect(response.status).toBe(200);
      expect(response.body.medication.frequency).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'NewName',
          dosage: '20mg',
          frequency: 'weekly',
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.medication).toMatchObject({
        name: 'NewName',
        dosage: '20mg',
        frequency: 'weekly',
        isActive: false,
      });
    });

    it('should return 400 when no fields provided', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 when medication not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/medications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'NewName' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Medication not found');
    });

    it('should return 403 when updating another user\'s medication', async () => {
      // Create another user
      const otherEmail = `medication-patch-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherToken = otherRegister.body.accessToken;
      const otherUserId = otherRegister.body.user.id;

      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot modify another user's medication");

      // Clean up other user
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch(`/api/medications/${medicationId}`)
        .send({ name: 'NewName' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/medications/:id', () => {
    let medicationId: string;

    beforeEach(async () => {
      const medication = await prisma.medication.create({
        data: { userId, name: 'DeleteTest', dosage: '5mg', frequency: 'daily' },
      });
      medicationId = medication.id;
    });

    afterEach(async () => {
      await prisma.medication.deleteMany({ where: { userId } });
    });

    it('should delete medication', async () => {
      const response = await request(app)
        .delete(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Medication deleted successfully');

      // Verify deletion
      const medication = await prisma.medication.findUnique({
        where: { id: medicationId },
      });
      expect(medication).toBeNull();
    });

    it('should return 404 when medication not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/medications/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Medication not found');
    });

    it('should return 403 when deleting another user\'s medication', async () => {
      // Create another user
      const otherEmail = `medication-delete-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherToken = otherRegister.body.accessToken;
      const otherUserId = otherRegister.body.user.id;

      const response = await request(app)
        .delete(`/api/medications/${medicationId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot delete another user's medication");

      // Clean up other user
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete(`/api/medications/${medicationId}`);

      expect(response.status).toBe(401);
    });
  });
});
