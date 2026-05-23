describe('API & Network Isolation (MSW)', () => {
  it('should intercept Google Books API calls and return mock data', async () => {
    const response = await fetch(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9788501012074',
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toBeDefined();
    expect(data.items[0].volumeInfo.title).toBe('Cem Anos de Solidão');
    expect(data.items[0].volumeInfo.authors).toContain(
      'Gabriel García Márquez',
    );
    expect(data.items[0].volumeInfo.industryIdentifiers[0].identifier).toBe(
      '9788501012074',
    );
  });

  it('should intercept the once-unhandled API after adding a handler', async () => {
    const response = await fetch('https://unhandled-api.com/data');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mocked).toBe(true);
  });
});
