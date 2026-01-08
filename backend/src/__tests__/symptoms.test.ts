import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('Symptom Endpoints', () => {
  let accessToken: string;
  let userId: string;
  const testUser = {
    email: 'symptomtest@example.com',
    password: 'password123',
    displayName: 'Symptom Test User',
  };

  beforeEach(async () => {
    await cleanupTestUsers();
    // Clean up any test symptoms
    await prisma.symptom.deleteMany({
      where: { userId: { not: null } },
    });

    // Register a user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.symptom.deleteMany({
      where: { userId: { not: null } },
    });
    await disconnectDb();
  });

  describe('GET /api/symptoms', () => {
    it('should return system default symptoms', async () => {
      const response = await request(app)
        .get('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.symptoms).toBeDefined();
      expect(Array.isArray(response.body.symptoms)).toBe(true);
      // Should include system defaults (seeded data)
      const systemDefaults = response.body.symptoms.filter(
        (s: { userId: string | null }) => s.userId === null
      );
      expect(systemDefaults.length).toBeGreaterThan(0);
    });

    it('should return user custom symptoms along with defaults', async () => {
      // Create a custom symptom via API
      await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Custom Symptom', category: 'Custom' });

      const response = await request(app)
        .get('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      const customSymptoms = response.body.symptoms.filter(
        (s: { userId: string | null }) => s.userId !== null
      );
      expect(customSymptoms.length).toBeGreaterThanOrEqual(1);
      const customSymptom = customSymptoms.find(
        (s: { name: string }) => s.name === 'Custom Symptom'
      );
      expect(customSymptom).toBeDefined();
      expect(customSymptom.category).toBe('Custom');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/symptoms');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/symptoms', () => {
    it('should create a custom symptom', async () => {
      const response = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Symptom', category: 'Test Category' });

      expect(response.status).toBe(201);
      expect(response.body.symptom).toBeDefined();
      expect(response.body.symptom.name).toBe('New Symptom');
      expect(response.body.symptom.category).toBe('Test Category');
      expect(response.body.symptom.userId).toBe(userId);
      expect(response.body.symptom.isActive).toBe(true);
    });

    it('should create symptom without category', async () => {
      const response = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'No Category Symptom' });

      expect(response.status).toBe(201);
      expect(response.body.symptom.name).toBe('No Category Symptom');
      expect(response.body.symptom.category).toBeNull();
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'Some Category' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/symptoms')
        .send({ name: 'Test Symptom' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/symptoms/:id', () => {
    let customSymptomId: string;

    beforeEach(async () => {
      const symptom = await prisma.symptom.create({
        data: {
          userId,
          name: 'Editable Symptom',
          category: 'Original Category',
        },
      });
      customSymptomId = symptom.id;
    });

    it('should update symptom name', async () => {
      const response = await request(app)
        .patch(`/api/symptoms/${customSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.symptom.name).toBe('Updated Name');
      expect(response.body.symptom.category).toBe('Original Category');
    });

    it('should update symptom category', async () => {
      const response = await request(app)
        .patch(`/api/symptoms/${customSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'New Category' });

      expect(response.status).toBe(200);
      expect(response.body.symptom.category).toBe('New Category');
    });

    it('should update isActive', async () => {
      const response = await request(app)
        .patch(`/api/symptoms/${customSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.symptom.isActive).toBe(false);
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/symptoms/${customSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent symptom', async () => {
      const response = await request(app)
        .patch('/api/symptoms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Symptom not found');
    });

    it('should return 403 when trying to modify system default', async () => {
      // Get a system default symptom
      const systemSymptom = await prisma.symptom.findFirst({
        where: { userId: null },
      });

      if (!systemSymptom) {
        // Skip if no system defaults exist
        return;
      }

      const response = await request(app)
        .patch(`/api/symptoms/${systemSymptom.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify system default symptoms');
    });

    it('should return 403 when trying to modify another user\'s symptom', async () => {
      // Create another user and their symptom via API
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'symptom-other-user@example.com',
          password: 'password123',
        });
      const otherAccessToken = otherUserResponse.body.accessToken;

      // Create symptom as other user
      const otherSymptomResponse = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Other User Symptom' });

      const otherSymptomId = otherSymptomResponse.body.symptom.id;

      // Try to modify with original user's token
      const response = await request(app)
        .patch(`/api/symptoms/${otherSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Stolen' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify another user\'s symptom');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/symptoms/${customSymptomId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/symptoms/:id', () => {
    let customSymptomId: string;

    beforeEach(async () => {
      const symptom = await prisma.symptom.create({
        data: {
          userId,
          name: 'Deletable Symptom',
        },
      });
      customSymptomId = symptom.id;
    });

    it('should delete custom symptom', async () => {
      const response = await request(app)
        .delete(`/api/symptoms/${customSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Symptom deleted successfully');

      // Verify it's deleted
      const deleted = await prisma.symptom.findUnique({
        where: { id: customSymptomId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent symptom', async () => {
      const response = await request(app)
        .delete('/api/symptoms/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Symptom not found');
    });

    it('should return 403 when trying to delete system default', async () => {
      const systemSymptom = await prisma.symptom.findFirst({
        where: { userId: null },
      });

      if (!systemSymptom) {
        return;
      }

      const response = await request(app)
        .delete(`/api/symptoms/${systemSymptom.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete system default symptoms');
    });

    it('should return 403 when trying to delete another user\'s symptom', async () => {
      // Create another user and their symptom via API
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'symptom-delete-other@example.com',
          password: 'password123',
        });
      const otherAccessToken = otherUserResponse.body.accessToken;

      // Create symptom as other user
      const otherSymptomResponse = await request(app)
        .post('/api/symptoms')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({ name: 'Other User Symptom' });

      const otherSymptomId = otherSymptomResponse.body.symptom.id;

      // Try to delete with original user's token
      const response = await request(app)
        .delete(`/api/symptoms/${otherSymptomId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete another user\'s symptom');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete(`/api/symptoms/${customSymptomId}`);

      expect(response.status).toBe(401);
    });
  });
});
