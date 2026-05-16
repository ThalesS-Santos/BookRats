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
  },
  {
    id: 'influenciador',
    title: 'Influenciador',
    icon: 'star',
    mission: 'Consiga um total de 50 curtidas (claps) em suas anotações.',
    check: (userData) => (userData.totalClaps || 0) >= 50
  },
  // --- NOVAS BADGES (20 UNIDADES) ---
  {
    id: 'badge_books_5',
    title: 'Explorador Literário',
    icon: 'library',
    mission: 'Conclua 5 livros da sua biblioteca.',
    check: (userData) => (userData.completedBooks || 0) >= 5
  },
  {
    id: 'badge_books_10',
    title: 'Mestre da Biblioteca',
    icon: 'ribbon',
    mission: 'Conclua 10 livros da sua biblioteca.',
    check: (userData) => (userData.completedBooks || 0) >= 10
  },
  {
    id: 'badge_books_25',
    title: 'Lenda da Leitura',
    icon: 'trophy',
    mission: 'Conclua 25 livros da sua biblioteca.',
    check: (userData) => (userData.completedBooks || 0) >= 25
  },
  {
    id: 'badge_page_1000',
    title: 'Maratonista',
    icon: 'walk',
    mission: 'Leia um total de 1.000 páginas.',
    check: (userData) => (userData.totalPagesRead || 0) >= 1000
  },
  {
    id: 'badge_page_5000',
    title: 'Enciclopédia Humana',
    icon: 'school',
    mission: 'Leia um total de 5.000 páginas.',
    check: (userData) => (userData.totalPagesRead || 0) >= 5000
  },
  {
    id: 'badge_page_10000',
    title: 'Devorador de Livros',
    icon: 'skull',
    mission: 'Leia um total de 10.000 páginas.',
    check: (userData) => (userData.totalPagesRead || 0) >= 10000
  },
  {
    id: 'badge_streak_15',
    title: 'Sequência de Fogo',
    icon: 'bonfire',
    mission: 'Mantenha uma sequência de leitura de 15 dias.',
    check: (userData) => (userData.streak || 0) >= 15
  },
  {
    id: 'badge_streak_30',
    title: 'Inabalável',
    icon: 'shield-checkmark',
    mission: 'Mantenha uma sequência de leitura de 30 dias.',
    check: (userData) => (userData.streak || 0) >= 30
  },
  {
    id: 'badge_streak_100',
    title: 'Centurião',
    icon: 'infinite',
    mission: 'Mantenha uma sequência de leitura de 100 dias.',
    check: (userData) => (userData.streak || 0) >= 100
  },
  {
    id: 'badge_annotator_10',
    title: 'Aprendiz de Escriba',
    icon: 'create',
    mission: 'Crie 10 anotações nos seus livros.',
    check: (userData) => (userData.totalNotes || 0) >= 10
  },
  {
    id: 'badge_annotator_50',
    title: 'Anotador Compulsivo',
    icon: 'brush',
    mission: 'Crie 50 anotações nos seus livros.',
    check: (userData) => (userData.totalNotes || 0) >= 50
  },
  {
    id: 'badge_session_marathon',
    title: 'Leitura Imersiva',
    icon: 'hourglass',
    mission: 'Leia por mais de 60 minutos em uma única sessão.',
    check: (userData) => (userData.maxSessionTime || 0) >= 60
  },
  {
    id: 'badge_collection_20',
    title: 'Colecionador',
    icon: 'copy',
    mission: 'Tenha 20 livros na sua biblioteca.',
    check: (userData) => (userData.totalBooks || 0) >= 20
  },
  {
    id: 'badge_wishlist_10',
    title: 'Desejo Ardente',
    icon: 'gift',
    mission: 'Adicione 10 livros à sua lista de desejos.',
    check: (userData) => (userData.wishlistBooks || 0) >= 10
  },
  {
    id: 'badge_social_claps',
    title: 'Fã de Echos',
    icon: 'thumbs-up',
    mission: 'Dê 50 claps em anotações da comunidade.',
    check: (userData) => (userData.clapsGiven || 0) >= 50
  },
  {
    id: 'badge_friends_5',
    title: 'Socialite',
    icon: 'people',
    mission: 'Tenha 5 amigos na sua rede de leitura.',
    check: (userData) => (userData.friendCount || 0) >= 5
  },
  {
    id: 'badge_night_owl',
    title: 'Coruja da Noite',
    icon: 'moon',
    mission: 'Registre uma leitura entre 00:00 e 04:00.',
    check: (userData) => userData.isNightReader === true
  },
  {
    id: 'badge_early_bird',
    title: 'Pássaro Matinal',
    icon: 'sunny',
    mission: 'Registre uma leitura entre 05:00 e 08:00.',
    check: (userData) => userData.isEarlyReader === true
  },
  {
    id: 'badge_fast_reader',
    title: 'Leitor Veloz',
    icon: 'rocket',
    mission: 'Leia 50 páginas em um único dia.',
    check: (userData) => (userData.pagesToday || 0) >= 50
  },
  {
    id: 'badge_diversity',
    title: 'Gosto Eclético',
    icon: 'color-palette',
    mission: 'Leia livros de 3 categorias diferentes.',
    check: (userData) => (userData.categoriesReadCount || 0) >= 3
  }
];
