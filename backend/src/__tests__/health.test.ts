import request from 'supertest';
import app from '../app';

describe('Health Check Endpoint', () => {
  describe('GET /api/health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    });

    it('should return status ok', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.status).toBe('ok');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/api/health');
      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should return JSON content type', async () => {
      const response = await request(app).get('/api/health');
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
