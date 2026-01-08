import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

describe('Habit Endpoints', () => {
  let authToken: string;
  let userId: string;
  const testEmail = `habit-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Register and login a test user
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      displayName: 'Habit Test User',
    });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up test user and their data
    if (userId) {
      await prisma.habitLog.deleteMany({ where: { userId } });
      await prisma.habit.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('GET /api/habits', () => {
    it('should return system default habits', async () => {
      const response = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.habits).toBeDefined();
      expect(Array.isArray(response.body.habits)).toBe(true);

      // System defaults should have userId = null
      const systemDefaults = response.body.habits.filter(
        (h: { userId: string | null }) => h.userId === null
      );
      expect(systemDefaults.length).toBeGreaterThan(0);
    });

    it('should return user custom habits along with defaults', async () => {
      // Create a custom habit
      const customHabit = await prisma.habit.create({
        data: {
          userId,
          name: 'Custom Test Habit',
          trackingType: 'boolean',
        },
      });

      const response = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Should include both system defaults and custom habit
      const customHabits = response.body.habits.filter(
        (h: { userId: string | null }) => h.userId === userId
      );
      expect(customHabits.length).toBeGreaterThanOrEqual(1);
      expect(customHabits.some((h: { name: string }) => h.name === 'Custom Test Habit')).toBe(true);

      // Clean up
      await prisma.habit.delete({ where: { id: customHabit.id } });
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/habits');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/habits', () => {
    afterEach(async () => {
      await prisma.habit.deleteMany({ where: { userId } });
    });

    it('should create a boolean habit', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Meditated',
          trackingType: 'boolean',
        });

      expect(response.status).toBe(201);
      expect(response.body.habit).toMatchObject({
        name: 'Meditated',
        trackingType: 'boolean',
        unit: null,
        isActive: true,
        userId,
      });
    });

    it('should create a numeric habit with unit', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Water Intake',
          trackingType: 'numeric',
          unit: 'glasses',
        });

      expect(response.status).toBe(201);
      expect(response.body.habit).toMatchObject({
        name: 'Water Intake',
        trackingType: 'numeric',
        unit: 'glasses',
        isActive: true,
      });
    });

    it('should create a duration habit', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Reading Time',
          trackingType: 'duration',
          unit: 'minutes',
        });

      expect(response.status).toBe(201);
      expect(response.body.habit).toMatchObject({
        name: 'Reading Time',
        trackingType: 'duration',
        unit: 'minutes',
      });
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingType: 'boolean',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing trackingType', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Some Habit',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid trackingType', async () => {
      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Some Habit',
          trackingType: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).post('/api/habits').send({
        name: 'Test Habit',
        trackingType: 'boolean',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/habits/:id', () => {
    let habitId: string;

    beforeEach(async () => {
      const habit = await prisma.habit.create({
        data: {
          userId,
          name: 'Update Test Habit',
          trackingType: 'boolean',
        },
      });
      habitId = habit.id;
    });

    afterEach(async () => {
      await prisma.habit.deleteMany({ where: { userId } });
    });

    it('should update habit name', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.habit.name).toBe('Updated Name');
    });

    it('should update habit trackingType', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ trackingType: 'numeric' });

      expect(response.status).toBe(200);
      expect(response.body.habit.trackingType).toBe('numeric');
    });

    it('should update habit unit', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ unit: 'times' });

      expect(response.status).toBe(200);
      expect(response.body.habit.unit).toBe('times');
    });

    it('should update habit isActive', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.habit.isActive).toBe(false);
    });

    it('should set unit to null', async () => {
      // First set a unit
      await prisma.habit.update({
        where: { id: habitId },
        data: { unit: 'glasses' },
      });

      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ unit: null });

      expect(response.status).toBe(200);
      expect(response.body.habit.unit).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Name',
          trackingType: 'numeric',
          unit: 'cups',
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.habit).toMatchObject({
        name: 'New Name',
        trackingType: 'numeric',
        unit: 'cups',
        isActive: false,
      });
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 404 for non-existent habit', async () => {
      const response = await request(app)
        .patch('/api/habits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit not found');
    });

    it('should return 403 when trying to modify system default', async () => {
      // Get a system default habit
      const systemHabit = await prisma.habit.findFirst({
        where: { userId: null },
      });

      if (!systemHabit) {
        // Skip test if no system defaults exist
        return;
      }

      const response = await request(app)
        .patch(`/api/habits/${systemHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot modify system default habits');
    });

    it('should return 403 when trying to modify another user\'s habit', async () => {
      // Create another user with a habit
      const otherEmail = `habit-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit for other user
      const otherHabit = await prisma.habit.create({
        data: {
          userId: otherUserId,
          name: 'Other User Habit',
          trackingType: 'boolean',
        },
      });

      // Try to update with original user
      const response = await request(app)
        .patch(`/api/habits/${otherHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot modify another user's habit");

      // Clean up
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/habits/:id', () => {
    let habitId: string;

    beforeEach(async () => {
      const habit = await prisma.habit.create({
        data: {
          userId,
          name: 'Delete Test Habit',
          trackingType: 'boolean',
        },
      });
      habitId = habit.id;
    });

    afterEach(async () => {
      await prisma.habit.deleteMany({ where: { userId } });
    });

    it('should delete custom habit', async () => {
      const response = await request(app)
        .delete(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Habit deleted successfully');

      // Verify deletion
      const habit = await prisma.habit.findUnique({
        where: { id: habitId },
      });
      expect(habit).toBeNull();
    });

    it('should return 404 for non-existent habit', async () => {
      const response = await request(app)
        .delete('/api/habits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Habit not found');
    });

    it('should return 403 when trying to delete system default', async () => {
      // Get a system default habit
      const systemHabit = await prisma.habit.findFirst({
        where: { userId: null },
      });

      if (!systemHabit) {
        // Skip test if no system defaults exist
        return;
      }

      const response = await request(app)
        .delete(`/api/habits/${systemHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete system default habits');
    });

    it('should return 403 when trying to delete another user\'s habit', async () => {
      // Create another user with a habit
      const otherEmail = `habit-delete-other-${Date.now()}@example.com`;
      const otherRegister = await request(app).post('/api/auth/register').send({
        email: otherEmail,
        password: testPassword,
        displayName: 'Other User',
      });

      expect(otherRegister.status).toBe(201);
      const otherUserId = otherRegister.body.user.id;

      // Create habit for other user
      const otherHabit = await prisma.habit.create({
        data: {
          userId: otherUserId,
          name: 'Other User Habit',
          trackingType: 'boolean',
        },
      });

      // Try to delete with original user
      const response = await request(app)
        .delete(`/api/habits/${otherHabit.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Cannot delete another user's habit");

      // Clean up
      await prisma.habit.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete(`/api/habits/${habitId}`);

      expect(response.status).toBe(401);
    });
  });
});
