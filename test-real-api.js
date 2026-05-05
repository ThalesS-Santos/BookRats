/**
 * Script de Teste Rápido: Google Books API (Real)
 * 
 * Este script valida se a sua chave de API está funcionando corretamente
 * e se o projeto consegue buscar dados reais.
 */

// Importa o dotenv para ler sua chave do arquivo .env
require('dotenv').config();

async function runTest() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const bookTitle = 'Dom Casmurro';
  
  if (!apiKey) {
    console.error('❌ ERRO: Chave de API não encontrada no arquivo .env');
    console.log('Certifique-se de que EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY está definida.');
    return;
  }

  const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookTitle)}&maxResults=1&key=${apiKey}`;

  console.log(`\n🚀 Iniciando teste de conexão...`);
  console.log(`📂 Buscando por: "${bookTitle}"`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo;
      console.log('\n✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
      console.log('====================================');
      console.log(`📖 Título: ${book.title}`);
      console.log(`✍️  Autor:  ${book.authors?.join(', ')}`);
      console.log(`📄 Páginas: ${book.pageCount}`);
      console.log('====================================');
      console.log('O seu app já pode consumir dados reais agora.\n');
    } else {
      console.log('\n⚠️  A API respondeu, mas não encontrou o livro.');
      console.log('Resposta completa:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ ERRO NA REQUISIÇÃO:', error.message);
  }
}

runTest();
