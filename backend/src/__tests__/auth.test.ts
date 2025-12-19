import request from 'supertest';
import app from '../app';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await disconnectDb();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user.displayName).toBe(validUser.displayName);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.timezone).toBe('UTC');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      // Should not return password
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should register user without displayName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test2@example.com', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body.user.displayName).toBeNull();
    });

    it('should return 409 when email already exists', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(validUser);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: 'Password must be at least 8 characters',
        })
      );
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
