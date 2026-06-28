# Arquitetura de Parcerias com Editoras e Autores (Clubes Patrocinados)

Este documento apresenta o projeto de software, a modelagem de dados analítica e o design de negócios para a plataforma de autoatendimento (Self-Serve Business Portal) voltada para editoras e autores impulsionarem lançamentos no **BookRats**.

---

## 1. Modelo de Negócio B2B (Business-to-Business)

O modelo de parcerias corporativas com editoras e autores independentes visa explorar canais alternativos de marketing de alta conversão. Em vez de simplesmente exibir banners genéricos no aplicativo, as marcas pagam para engajar diretamente com a comunidade de leitores.

```
[Editora / Autor] ──> [Cria Campanha no Painel Web] ──> [Define Target e Orçamento]
                                                               │
                                                               ▼
[App BookRats Mobile] <── [Recomendações e Badges] <── [Dispara Grupo de Leitura Coletiva]
```

### Formas de Contratos e Campanhas:
1.  **Grupo de Leitura Coletiva Patrocinado (Sponsored Book Clubs)**: Editoras pagam um valor fixo mensal para manter um grupo oficial de leitura moderado por um influenciador literário. Os usuários debatem capítulos e recebem badges exclusivas ao concluir metas de leitura.
2.  **Impulsionamento de Leitura (Paid Recommendation Engine)**: O livro patrocinado ganha peso extra no algoritmo de sugestões personalizadas do app, aparecendo na seção "Mais Recomendados para Você" baseando-se nas tags literárias preferidas do usuário.
3.  **Desafios Temáticos Promocionais**: Marcas financiam prêmios reais ou virtuais (RatsCoins, e-books gratuitos) para quem concluir a leitura de determinado acervo no período estipulado.

---

## 2. Fluxo e UI/UX no Frontend (React Native + Expo)

A promoção de livros patrocinados deve se integrar organicamente à experiência de uso, assemelhando-se a um conteúdo nativo e bem sinalizado, evitando a rejeição típica dos anúncios invasivos.

### Recursos Visuais no App:
1.  **Etiqueta de Transparência (Sponsorship Disclaimers)**: Qualquer livro impulsionado exibe uma marcação discreta, ex: "Patrocinado por [Editora Rocco]" ou "Parceria BookRats".
2.  **Cards de Grupos Oficiais na Home**: Card proeminente no topo da aba de grupos sociais do usuário, utilizando gradientes refinados e um badge "Oficial" verificado de cor azul/ouro.
3.  **Notificações Push com Deep Linking**: Enviar push convites para usuários que já leram livros do mesmo autor no passado: *“A Editora Intrínseca acaba de criar um grupo oficial para o novo lançamento de Stephen King. Venha ler junto!”*

### Código de Exemplo: Recomendação de Livro Patrocinado (Frontend)
```javascript
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function SponsoredBookCard({ book, navigation }) {
  const handlePressBook = () => {
    // Registra métrica de visualização qualificada antes da navegação
    trackImpression(book.id, book.campaignId);
    navigation.navigate('BookDetails', { bookId: book.id });
  };

  const trackImpression = (bookId, campaignId) => {
    // Disparo assíncrono para o barramento de eventos (Analytics pipeline)
    fetch('https://api.bookrats.com/v1/analytics/campaign-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        campaignId,
        eventType: 'impression',
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePressBook}>
      <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      <View style={styles.info}>
        <Text style={styles.sponsorBadge}>✦ PATROCINADO POR {book.sponsorName.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        <Text style={styles.description} numberOfLines={3}>{book.description}</Text>
        
        <View style={styles.actionRow}>
          <Text style={styles.readersCount}>🔥 {book.activeReaders} leitores ativos</Text>
          <Text style={styles.joinButton}>Ver Detalhes</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#2C2C2E' },
  cover: { width: 90, height: 130, borderRadius: 8 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  sponsorBadge: { fontSize: 10, color: '#FFD700', fontWeight: 'bold', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginTop: 4 },
  author: { fontSize: 14, color: '#8E8E93' },
  description: { fontSize: 12, color: '#AEAEB2', marginVertical: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  readersCount: { fontSize: 12, color: '#30D158', fontWeight: '500' },
  joinButton: { fontSize: 12, color: '#FFD700', fontWeight: 'bold' }
});
```

---

## 3. Estrutura e Modelagem do Banco de Dados (Firestore)

A modelagem de campanhas de publicidade B2B deve armazenar as regras de orçamento, datas de validade e critérios de segmentação do público-alvo.

### Coleção `/campaigns/{campaignId}`
Estrutura que gerencia as campanhas ativas no sistema.

```json
{
  "campaignId": "camp_rocco_001",
  "sponsorId": "sponsor_rocco_publishing",
  "sponsorName": "Editora Rocco",
  "bookId": "harry_potter_edição_comemorativa",
  "title": "Harry Potter e a Pedra Filosofal - Nova Edição",
  "status": "active",
  "budget": {
    "total": 50000.00,
    "remaining": 42000.00,
    "currency": "BRL",
    "costPerClick": 0.50
  },
  "targeting": {
    "genres": ["fantasia", "aventura", "jovens_adultos"],
    "countries": ["BR", "PT"],
    "ageRange": [13, 35]
  },
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-07-01T00:00:00Z"
}
```

### Coleção `/groups/{groupId}` (Subtipo Oficial/Patrocinado)
```json
{
  "groupId": "grp_hp_oficial",
  "name": "Clube Oficial: Harry Potter",
  "isOfficial": true,
  "sponsorId": "sponsor_rocco_publishing",
  "associatedBookId": "harry_potter_edição_comemorativa",
  "membersCount": 15400,
  "activeGoal": {
    "goalId": "goal_hp_cap_1_to_5",
    "description": "Ler os capítulos 1 ao 5 até sexta-feira",
    "rewardBadgeId": "badge_rocco_wizard"
  }
}
```

---

## 4. Métodos Enterprise para Big Data e Escala de Bilhões de Leituras

Gerenciar dados de auditoria publicitária de forma correta e veloz para bilhões de impressões diárias requer isolamento absoluto do banco de dados operacional.

```
[App Mobile] ──(Dispara Evento)──> [GCP Pub/Sub] ──> [Google Dataflow (Spark/Fink)] ──> [BigQuery (Deep Storage)]
                                                                                            │
                                                                                 (Agregações Programadas)
                                                                                            │
                                                                                            ▼
[Editoras: Dashboard Web Portal] <── [Snapshot de Cache] <── [Firestore /analytics_cache]
```

### Arquitetura de Big Data Decoupling
1.  **Ingestão Sem Fricção**:
    *   O clique ou visualização do livro patrocinado é transmitido como evento leve JSON para a infraestrutura do **Google Cloud Pub/Sub**.
2.  **Processamento em Tempo Real (Data Pipelines)**:
    *   Uma subinscrição do Pub/Sub encaminha os streams para o **Google Cloud Dataflow (Apache Beam)** que limpa bots e visualizações duplicadas.
3.  **Armazenamento em Data Lake**:
    *   Todos os registros brutos de cliques e visualizações são guardados de forma definitiva no **Google BigQuery**.
4.  **Resumos Diários para Clientes (Aggregation Caching)**:
    *   O painel web da editora não realiza queries agregadas em bilhões de linhas diretamente no BigQuery. Isso custaria milhares de dólares e travaria a UI.
    *   Um script de backend executa a cada hora para calcular o acumulado de cliques, impressões e conversões e grava um pequeno snapshot estático e consolidado na coleção `/campaign_analytics` no Firestore, onde o portal da editora lê de forma instantânea.

---

## 5. Estratégias Avançadas de Crescimento e Parcerias B2B

Táticas de engajamento corporativo para prender leitores e atrair editoras:

### Segmentação de Campanha por Afinidade de Gêneros Literários
*   O motor de sugestão do BookRats lê os vetores de afinidade (Embeddings de leitura do leitor com base no histórico de livros curtidos e anotados com claps) e exibe o anúncio patrocinado apenas para usuários cujo interesse estimado na categoria literária do livro impulsionado seja superior a **85%**. Isso gera altíssimo CTR (Click-Through Rate) para o anunciante.

### Desafios de Leitura (Gamification Challenges)
*   **Contrato baseado em KPI**: A editora Rocco cria o "Mês da Fantasia Rocco". O app exibe uma barra de progresso global para a comunidade. Se a comunidade de usuários atingir o marco de ler 1.000.000 de páginas no total durante aquele mês, a editora libera cupons de desconto reais de 40% na compra de livros físicos para todos os participantes diretamente em seus perfis.
*   **Benefício duplo**: Aumenta absurdamente o engajamento geral no app (usuários lêem mais e usam mais o app) e gera alto faturamento de patrocínio direto.
