import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';
import { cleanupTestUsers, disconnectDb } from './helpers/testDb';

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await cleanupTestUsers();
    // Also clean up password reset tokens for test users
    await prisma.passwordResetToken.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.passwordResetToken.deleteMany({});
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

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'testlogin@example.com',
      password: 'password123',
    };

    beforeEach(async () => {
      // Create a test user for login tests
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should return 401 for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: 'testrefresh@example.com', password: 'password123' });
      refreshToken = registerResponse.body.refreshToken;
    });

    it('should return new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return success message', async () => {
      const response = await request(app).post('/api/auth/logout').send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'testforgot@example.com', password: 'password123' });
    });

    it('should return success message for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testforgot@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain(
        'If an account with that email exists'
      );
    });

    it('should return same message for non-existent email (prevent enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain(
        'If an account with that email exists'
      );
    });

    it('should create a password reset token', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testforgot@example.com' });

      const user = await prisma.user.findUnique({
        where: { email: 'testforgot@example.com' },
      });
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      expect(resetToken).toBeDefined();
      expect(resetToken!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Create user and get reset token
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'testreset@example.com', password: 'password123' });

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testreset@example.com' });

      const user = await prisma.user.findUnique({
        where: { email: 'testreset@example.com' },
      });
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });
      resetToken = tokenRecord!.token;
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'newpassword123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'testreset@example.com', password: 'newpassword123' });

      expect(loginResponse.status).toBe(200);
    });

    it('should delete reset token after use', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'newpassword123' });

      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken },
      });

      expect(tokenRecord).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should return 400 for expired token', async () => {
      // Update token to be expired
      await prisma.passwordResetToken.update({
        where: { token: resetToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'newpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
