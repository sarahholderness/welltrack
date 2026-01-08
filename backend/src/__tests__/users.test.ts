import request from 'supertest';
import app from '../app';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('User Endpoints', () => {
  let accessToken: string;
  const testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    displayName: 'Test User',
  };

  beforeEach(async () => {
    await cleanupTestUsers();
    // Register a user and get token
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await disconnectDb();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.displayName).toBe(testUser.displayName);
      expect(response.body.user.timezone).toBe('UTC');
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.createdAt).toBeDefined();
      // Should not return sensitive fields
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update displayName', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.user.displayName).toBe('Updated Name');
    });

    it('should update timezone', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ timezone: 'America/New_York' });

      expect(response.status).toBe(200);
      expect(response.body.user.timezone).toBe('America/New_York');
    });

    it('should update both displayName and timezone', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'New Name', timezone: 'Europe/London' });

      expect(response.status).toBe(200);
      expect(response.body.user.displayName).toBe('New Name');
      expect(response.body.user.timezone).toBe('Europe/London');
    });

    it('should return 400 with empty body', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .send({ displayName: 'New Name' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/users/me', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');

      // Verify user is deleted by trying to get profile
      const getResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete('/api/users/me');

      expect(response.status).toBe(401);
    });
  });
});
