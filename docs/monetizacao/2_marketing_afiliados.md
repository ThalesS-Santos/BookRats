# Integração de Marketing de Afiliados (Amazon e Lojas Digitais)

Este documento detalha o design técnico, a arquitetura do banco de dados e as estratégias de crescimento em escala global para o sistema de marketing de afiliados do **BookRats**, otimizando a conversão e garantindo que o sistema suporte bilhões de requisições de consulta diárias.

---

## 1. Modelo de Negócio e Engenharia de Conversão

O marketing de afiliados permite monetizar cliques convertidos em compras nas plataformas de varejo (Amazon, Google Books, Kobo, Saraiva) através do recebimento de comissões que variam de 4% a 15% por livro vendido.

### Funil de Decisão do Leitor no App:
```
[Visualizar Detalhes do Livro] 
       │
       ├──> [Compara Preços em Tempo Real (Físico vs. Kindle vs. Audiolivro)]
       │
       ├──> [Clique no Link com Geo-Targeting + Tag de Afiliado]
       │
       └──> [Compra Finalizada no Navegador Externo / In-App Browser]
```

Para grandes plataformas, a conversão é potencializada pela **variedade de formatos** (físico, e-book e audiolivro) e pela **agilidade no redirecionamento**, evitando perda de sessões.

---

## 2. Fluxo e UI/UX no Frontend (React Native + Expo)

O frontend do BookRats precisa apresentar as ofertas de forma integrada na página do livro, com tempos de resposta instantâneos.

### Elementos Visuais Chave:
1.  **Botão de Ação Primária (CTA)**: Posicionado abaixo da capa do livro. Em vez de um botão genérico "Comprar", exibe-se "Comprar Livro (Físico ou E-book)".
2.  **Card Comparador de Preços (Dynamic Offers Grid)**:
    *   **Amazon (Físico)**: Mostra preço médio e link de afiliado.
    *   **Kindle (Digital)**: Atalho direto para compra digital imediata.
    *   **Audiolivro (Audible)**: Link promocional ("Escute Grátis com teste do Audible").
3.  **Loading & Shimmer Effect**:
    *   Enquanto os preços atualizados são buscados em cache ou na API de afiliados, a área de compra é preenchida por um esqueleto em animação cinza pulsante.
4.  **In-App Browser Customizado**:
    *   Utilizar `expo-web-browser` para abrir o link em uma sessão nativa do Safari/Chrome dentro do app, mantendo o usuário imerso no ecossistema BookRats e reduzindo a taxa de abandono do app.

### Código de Exemplo: Componente de Ofertas (Frontend)
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function BookPurchaseOptions({ bookId, isbn }) {
  const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca ofertas de afiliados cacheadas no backend
    const fetchOffers = async () => {
      try {
        const response = await fetch(`https://api.bookrats.com/v1/books/${bookId}/offers?isbn=${isbn}`);
        const data = await response.json();
        setOffers(data);
      } catch (e) {
        console.error('Erro ao carregar ofertas de afiliados', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [bookId, isbn]);

  const handleOpenStore = async (url) => {
    // Rastreamento síncrono de cliques antes do redirecionamento
    trackClickInBackground(bookId, url);
    await WebBrowser.openBrowserAsync(url);
  };

  const trackClickInBackground = (id, targetUrl) => {
    fetch('https://api.bookrats.com/v1/analytics/clicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: id, url: targetUrl, timestamp: new Date().toISOString() })
    }).catch(() => {}); // Falha silenciosa para não impactar a navegação do usuário
  };

  if (loading) {
    return <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />;
  }

  if (!offers) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Adquira este livro:</Text>
      
      {offers.map((offer) => (
        <TouchableOpacity
          key={offer.store}
          style={styles.offerButton}
          onPress={() => handleOpenStore(offer.affiliateUrl)}
        >
          <View style={styles.offerRow}>
            <Text style={styles.storeName}>🛒 {offer.storeName} ({offer.format})</Text>
            <Text style={styles.price}>{offer.price ? `R$ ${offer.price}` : 'Ver Preço'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#161618', borderRadius: 12, marginVertical: 12 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  offerButton: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { color: '#E5E5EA', fontSize: 15 },
  price: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  loader: { marginVertical: 20 }
});
```

---

## 3. Estrutura e Modelagem do Banco de Dados (Firestore)

Para manter a consistência e evitar custos inflados com APIs de terceiros que cobram por requisição (ex: Amazon Product Advertising API limita fortemente as chamadas por segundo), armazenamos as ofertas e links de afiliados estruturados no Firestore, com tempo de expiração curto (TTL).

### Coleção `/books/{bookId}/affiliates`
Cada livro armazena suas respectivas URLs de parceiros.

```json
{
  "bookId": "harry_potter_1",
  "isbn": "9788532511010",
  "lastFetched": "2026-06-27T18:00:00Z",
  "ttl": 86400, // 24 horas em segundos para atualizar preços
  "offers": [
    {
      "store": "amazon_br",
      "storeName": "Amazon Brasil",
      "format": "Físico",
      "price": 49.90,
      "affiliateUrl": "https://amzn.to/example_tag_harry_potter"
    },
    {
      "store": "amazon_kindle",
      "storeName": "Amazon Kindle",
      "format": "E-book",
      "price": 24.90,
      "affiliateUrl": "https://amzn.to/example_tag_harry_potter_kindle"
    }
  ]
}
```

### Coleção de Métricas de Cliques `/clicks/{clickId}`
Para analisar a taxa de conversão (CTR) e detectar fraudes ou links quebrados:

```json
{
  "clickId": "clk_xyz987",
  "userId": "user_abc123",
  "bookId": "harry_potter_1",
  "store": "amazon_br",
  "url": "https://amzn.to/example_tag_harry_potter",
  "createdAt": "2026-06-27T18:22:17Z",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0...)",
  "geo": {
    "country": "BR",
    "region": "SP"
  }
}
```

---

## 4. Métodos Enterprise para Suportar Bilhões de Acessos Simultâneos

A busca direta e em tempo real em APIs de e-commerce é inviável para bilhões de usuários concorrentes devido a severos limites de *Rate Limit*. A arquitetura corporativa deve desacoplar a busca do usuário da API real do parceiro.

```
[Usuário] ──> [Cloudflare CDN Cache (Edge)] ──(Se cache vencer)──> [GCP Memorystore (Redis)] ──> [Firestore]
                                                                                                    │
                                                                                [Cronjob de Background / Workers] 
                                                                                                    │
                                                                                                    ▼
                                                                                         [APIs de Parceiros (Amazon)]
```

### Arquitetura de Cache de 3 Níveis (Edge-First Caching)
1.  **Nível 1: Cloudflare Edge Network**:
    *   Toda requisição de ofertas (`/v1/books/{id}/offers`) passa por Workers no Cloudflare Edge. Se as ofertas do livro foram solicitadas nos últimos 60 minutos, elas são retornadas em **menos de 15ms** direto da rede de distribuição geográfica, sem sequer bater no servidor Firebase do BookRats.
2.  **Nível 2: Redis Cache (GCP Memorystore)**:
    *   Caso falte o cache na Edge, a Cloud Function consulta um banco em memória Redis com tempo de leitura sub-milissegundo.
3.  **Nível 3: Leitura Fria no Firestore + Fila de Atualização Assíncrona (BullMQ/PubSub)**:
    *   Se o livro não estiver no Redis, ele é lido do Firestore.
    *   Se a informação for mais antiga do que o TTL (24 horas), o banco retorna o preço antigo ao usuário imediatamente para garantir velocidade extrema, mas enfileira uma tarefa assíncrona no Google Cloud Pub/Sub para que um worker backend de forma paralela consulte a API da Amazon e atualize os dados no Firestore para o próximo leitor.

### Prevenção de Abuso de Gravação nos Cliques
Salvar cada clique diretamente no Firestore em alta escala mataria o banco com o limite de 10.000 gravações/segundo.
*   **Buffer de Analytics com BigQuery/PubSub**:
    *   O endpoint de rastreamento de cliques envia os metadados diretamente para um stream do **Google Cloud Pub/Sub**.
    *   O Pub/Sub direciona em lotes diretamente para o **Google BigQuery** (banco de dados analítico voltado a BI) sem passar pelo Firestore operacional de produção.

---

## 5. Estratégias Avançadas de Monetização Corporativa (LTV & Conversão)

Plataformas globais otimizam os links dinamicamente com base no contexto geográfico e histórico do usuário.

### Geo-Targeting Inteligente (Localização de ID de Afiliado)
*   Se um usuário brasileiro clica em um livro, ele deve ser enviado para a Amazon Brasil (`amazon.com.br`) com a tag de afiliado brasileira.
*   Se um usuário em Portugal clica no mesmo livro, a Cloud Function de roteamento intercepta o cabeçalho IP de localização geográfica e reescreve a URL para a Amazon Espanha (`amazon.es`) ou Reino Unido (`amazon.co.uk`) com o ID de afiliado correspondente daquela região. Isso evita a perda de comissões internacionais.

### A/B Testing de Varejistas (Smart Link Routing)
*   Alternar dinamicamente qual loja aparece em primeiro lugar ou possui o botão mais chamativo com base no histórico recente de melhor comissão daquela semana.
*   **Histórico de Compras**: Se o algoritmo detectar que o usuário assina o *Kindle Unlimited*, a interface automaticamente prioriza o botão "Ler de graça no Kindle Unlimited" no topo, maximizando a taxa de conversão do afiliado de assinaturas digitais.

---

## 6. Verificação de Integridade e Monitoramento de Links

Links quebrados ou tags de afiliados removidas pelas lojas causam perdas financeiras silenciosas e massivas.

### Script de Automação de Saúde de Links (Link Checker)
*   Criar um Cronjob diário executado no Google Cloud Scheduler que percorre as ofertas mais acessadas do Firestore e realiza requisições HTTP `HEAD` leves para validar se os destinos finais das URLs retornam `200 OK` ou redirecionam corretamente para as lojas. Se retornar `404 Not Found` ou `502 Bad Gateway`, o link é desativado automaticamente no banco e um alerta é enviado ao painel operacional.
