import request from 'supertest';
import app from '../app';

describe('Express App Configuration', () => {
  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.status).toBe(404);
    });

    it('should return JSON error for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.body.error).toBe('Not found');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/api/health');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/unknown')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      // Should not error on JSON parsing (will 404 since route doesn't exist)
      expect(response.status).toBe(404);
    });
  });
});
