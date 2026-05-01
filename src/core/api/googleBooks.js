import { apiClient } from './apiClient';

/**
 * @typedef {import('@core/types').Book} Book
 */

/**
 * Searches for books using the Google Books API.
 * This is an example of an external API integration using the new apiClient.
 * 
 * @param {string} query 
 * @returns {Promise<Book[]>}
 */
export const searchGoogleBooks = async (query) => {
  if (!query) return [];

  try {
    // A requisição usa o apiClient, que vai automaticamente injetar tokens
    // e tratar possíveis erros 401, 500 globalmente.
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
    const data = await apiClient.get(url);
    
    if (!data.items) return [];

    // Map external API data to our internal JSDoc Book type
    return data.items.map(item => ({
      id: item.id,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.[0] || 'Autor Desconhecido',
      description: item.volumeInfo.description || '',
      coverImage: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
      pageCount: item.volumeInfo.pageCount || 0,
      status: 'wantToRead',
      extraData: {
        publishedDate: item.volumeInfo.publishedDate,
        categories: item.volumeInfo.categories
      }
    }));
  } catch (error) {
    // Erros de rede, 401 ou 500 já foram logados e padronizados pelo interceptor!
    console.error('Error in searchGoogleBooks:', error.message);
    throw error;
  }
};
