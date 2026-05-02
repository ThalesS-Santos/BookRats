import { server } from '../mocks/server';
import { rest } from 'msw';

describe('MSW Handlers Verification', () => {
  it('should hit the echoes handler', async () => {
    const response = await fetch('https://api.bookrats.com/v1/echoes');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe('echo-1');
  });

  it('should hit the google books handler', async () => {
    const response = await fetch('https://www.googleapis.com/books/v1/volumes?q=test');
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.items[0].volumeInfo.title).toBe('Cem Anos de Solidão');
  });
});
