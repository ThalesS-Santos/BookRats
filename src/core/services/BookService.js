import { getUserAnnotations } from '@core/api/books';

/**
 * Camada de Serviço (Domain Layer).
 * Aqui ficam as regras de negócio puras, cálculos complexos e agregação de dados 
 * que não devem poluir a Interface (UI).
 */
export const BookService = {
  /**
   * Busca as anotações mais recentes dos livros que o usuário está lendo no momento.
   * 
   * @param {string} uid ID do usuário
   * @param {Array} readingBooks Lista de livros com status 'reading'
   * @param {number} limit Número máximo de anotações retornadas
   * @returns {Promise<Array>}
   */
  getRecentAnnotations: async (uid, readingBooks, limit = 3) => {
    if (!uid || !readingBooks || readingBooks.length === 0) return [];
    
    try {
      const allNotes = [];
      const topBooks = readingBooks.slice(0, 3);
      
      for (const book of topBooks) {
        const annots = await getUserAnnotations(uid, book.id);
        allNotes.push(...annots.map(a => ({ ...a, bookTitle: book.title })));
      }
      
      // Ordenação puramente na memória (Regra de Negócio)
      allNotes.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      return allNotes.slice(0, limit);
    } catch (error) {
      console.warn("Failed to fetch fresh notes:", error.message);
      return [];
    }
  }
};
