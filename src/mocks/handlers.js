import { rest } from 'msw';

export const handlers = [
  // Handler for Google Books Volume Search (MSW 1 syntax)
  rest.get('https://www.googleapis.com/books/v1/volumes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        items: [
          {
            id: 'mock-id-1',
            volumeInfo: {
              title: 'Cem Anos de Solidão',
              authors: ['Gabriel García Márquez'],
              pageCount: 418,
              industryIdentifiers: [
                {
                  type: 'ISBN_13',
                  identifier: '9788501012074',
                },
              ],
              imageLinks: {
                thumbnail: 'https://example.com/cover.jpg',
              },
            },
          },
        ],
      })
    );
  }),

  // Handler for Echoes/Annotations (for Gallery Integration Test)
  rest.get('https://api.bookrats.com/v1/echoes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'echo-1',
          userId: 'user-A',
          bookId: '123',
          text: 'Este capítulo é simplesmente genial!',
          pageLocation: 10,
          userMetadata: { displayName: 'Gabriel', isInfluencer: true, photoURL: null },
          reactions: { claps: 12 },
          timestamp: { seconds: 1629000000 },
        },
        {
          id: 'echo-2',
          userId: 'user-B',
          bookId: '123',
          text: 'A solidão aqui é quase um personagem.',
          pageLocation: 25,
          userMetadata: { displayName: 'Úrsula', isInfluencer: false, photoURL: null },
          reactions: { claps: 8 },
          timestamp: { seconds: 1629100000 },
        },
        {
          id: 'echo-3',
          userId: 'user-C',
          bookId: '123',
          text: 'Melhor parte até agora!',
          pageLocation: 50,
          userMetadata: { displayName: 'Aureliano', isInfluencer: false, photoURL: null },
          reactions: { claps: 5 },
          timestamp: { seconds: 1629200000 },
        },
        {
          id: 'echo-spoiler', // Pg 60 > 50 (current user page)
          userId: 'user-D',
          bookId: '123',
          text: 'SPOILER: Não acredito que isso aconteceu no final!',
          pageLocation: 60,
          userMetadata: { displayName: 'SpoilerBot', isInfluencer: false, photoURL: null },
          reactions: { claps: 0 },
          timestamp: { seconds: 1629300000 },
        },
        {
          id: 'echo-5',
          userId: 'user-E',
          bookId: '123',
          text: 'A escrita do Gabo é hipnotizante.',
          pageLocation: 40,
          userMetadata: { displayName: 'Amaranta', isInfluencer: true, photoURL: null },
          reactions: { claps: 20 },
          timestamp: { seconds: 1629400000 },
        },
      ])
    );
  }),
];
