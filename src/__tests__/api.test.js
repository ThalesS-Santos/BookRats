describe('API & Network Isolation (MSW)', () => {
  it('should intercept Google Books API calls and return mock data', async () => {
    const response = await fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:9788501012074');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(data.items[0].volumeInfo.title).toBe('Cem Anos de Solidão');
    expect(data.items[0].volumeInfo.authors).toContain('Gabriel García Márquez');
    expect(data.items[0].volumeInfo.industryIdentifiers[0].identifier).toBe('9788501012074');
  });

  it('should throw an error on unhandled network requests (isolation check)', async () => {
    // This is expected to log an error from MSW because it's not handled
    // and we configured onUnhandledRequest: 'error'
    
    // We wrap it in a try-catch to satisfy the test if it indeed fails as expected
    // or we can just expect it to fail. 
    // Actually, MSW 'error' choice makes the request fail in Node.
    
    await expect(fetch('https://unhandled-api.com/data')).rejects.toThrow();
  });
});
