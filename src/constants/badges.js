export const ALL_BADGES = [
  {
    id: 'badge_first_book',
    title: 'Primeiro Livro',
    icon: 'book',
    mission: 'Termine de ler o seu primeiro livro no app.',
    check: (userData) => (userData.completedBooks || 0) > 0
  },
  {
    id: 'badge_page_100',
    title: 'Cem Páginas',
    icon: 'layers',
    mission: 'Leia um total de 100 páginas.',
    check: (userData) => (userData.totalPagesRead || 0) >= 100
  },
  {
    id: 'badge_page_500',
    title: 'Super Leitor',
    icon: 'flash',
    mission: 'Leia um total de 500 páginas.',
    check: (userData) => (userData.totalPagesRead || 0) >= 500
  },
  {
    id: 'badge_streak_3',
    title: 'No Ritmo',
    icon: 'flame',
    mission: 'Mantenha uma sequência de leitura de 3 dias.',
    check: (userData) => (userData.streak || 0) >= 3
  },
  {
    id: 'badge_streak_7',
    title: 'Hábito Formado',
    icon: 'heart',
    mission: 'Mantenha uma sequência de leitura de 7 dias.',
    check: (userData) => (userData.streak || 0) >= 7
  },
  {
    id: 'badge_multitasker',
    title: 'Multitarefa',
    icon: 'albums',
    mission: 'Tenha 2 ou mais livros sendo lidos ao mesmo tempo.',
    check: (userData) => (userData.readingBooks || 0) >= 2
  }
];
