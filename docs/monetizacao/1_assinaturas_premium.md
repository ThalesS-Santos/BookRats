# Arquitetura de Assinaturas Premium ("BookRats Club")

Este documento detalha o projeto de engenharia, negócios e UX para a implementação de assinaturas recorrentes (mensais e anuais) no **BookRats**, utilizando padrões de nível enterprise aplicados por gigantes como Spotify, Duolingo e Netflix.

---

## 1. Modelo de Negócios e Diferenciação de Acesso

Para maximizar a receita (LTV) e reduzir o custo de aquisição (CAC), o modelo de assinatura diferencia os planos com base no perfil de engajamento do leitor:

```
[Usuário Gratuito] ──(Gatilhos de Limite/IA)──> [Tela de Paywall] ──(Conversão)──> [Assinante Premium]
                                                                                     ├── Mensal (Flexível)
                                                                                     └── Anual (LTV Alto / Desconto)
```

### Planos Oferecidos:
1.  **Plano Mensal (Flexibilidade)**: Ideal para usuários experimentais. Preço cheio, cobrado recorrentemente a cada 30 dias. Alto índice de cancelamento (churn), mas barreira de entrada baixa.
2.  **Plano Anual (Comprometimento)**: Focado em leitores assíduos. Oferece desconto de 30% a 40% em relação ao custo acumulado do plano mensal. Reduz drasticamente o churn anual e garante fluxo de caixa imediato.
3.  **Acesso Vitalício (One-time purchase)**: Disponibilizado em campanhas especiais de marketing (ex: Black Friday). Pagamento único que garante acesso para sempre. Excelente para impulsionar receita de curto prazo.

---

## 2. Fluxo e UI/UX no Frontend (React Native + Expo)

O design de interface do paywall deve ser focado em conversão, carregamento rápido e navegação fluida, mesmo sob condições de rede instáveis.

### Telas e Fluxos do Usuário (User Journey)
1.  **Pontos de Gatilho (Triggers)**:
    *   Ao tentar adicionar o 4º livro na biblioteca ativa (limite gratuito = 3).
    *   Ao clicar no ícone do "Assistente de Leitura com IA".
    *   Ao tentar baixar estatísticas avançadas de leitura em PDF.
2.  **A Tela de Paywall (Premium Screen)**:
    *   **Estética Premium**: Uso de gradientes metálicos sutis (ex: Dark Violet a Obsidian Black), tipografia limpa (Inter/Outfit), micro-animações nas features (badges flutuando) e contraste nítido de preços.
    *   **Proposta de Valor**: Lista de 3 a 4 benefícios claros com ícones customizados.
    *   **Seletor de Planos**: Um slider ou cards lado a lado destacando o plano Anual como **"Melhor Custo-Benefício"** (tática de ancoragem de preço).
    *   **CTA Claro (Call to Action)**: Botão grande com gradiente de alta energia (ex: Dourado/Laranja) dizendo "Assine Agora - 7 Dias Grátis".
    *   **Elementos Legais e de Transparência**: Links explícitos para Termos de Uso (EULA), Política de Privacidade e botão de "Restaurar Compras".
3.  **Loading & Feedback**:
    *   Durante a transação, desabilitar a tela inteira com um overlay translúcido e um skeleton animation de carregamento.
    *   Evitar travamentos no loop de renderização utilizando `InteractionManager.runAfterInteractions` para processos de compra em segundo plano.

### Código de Exemplo: Componente de Paywall Premium (Frontend)
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Purchases from 'react-native-purchases'; // SDK RevenueCat

export default function PaywallScreen({ navigation }) {
  const [packages, setPackages] = useState([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    // Carrega os pacotes configurados no RevenueCat
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
          setPackages(offerings.current.availablePackages);
          // Pré-seleciona o plano anual (âncora)
          const annual = offerings.current.availablePackages.find(p => p.packageType === 'ANNUAL');
          setSelectedPackage(annual || offerings.current.availablePackages[0]);
        }
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível carregar as ofertas de assinatura.');
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    try {
      const { purchaserInfo } = await Purchases.purchasePackage(selectedPackage);
      if (purchaserInfo.entitlements.active['premium_access']) {
        Alert.alert('Sucesso!', 'Você agora é um membro do BookRats Club!');
        navigation.goBack();
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Erro na Compra', e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BookRats Club</Text>
      <Text style={styles.subtitle}>Desbloqueie o poder máximo da sua leitura</Text>

      {/* Lista de Recursos Premium */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featureText}>✨ Biblioteca ativa ilimitada</Text>
        <Text style={styles.featureText}>🤖 Assistente de Leitura com IA</Text>
        <Text style={styles.featureText}>📊 Relatórios avançados de leitura</Text>
        <Text style={styles.featureText}>🚫 Sem anúncios</Text>
      </View>

      {/* Seleção de Planos */}
      {packages.map((pkg) => (
        <TouchableOpacity
          key={pkg.identifier}
          style={[
            styles.packageCard,
            selectedPackage?.identifier === pkg.identifier && styles.selectedCard
          ]}
          onPress={() => setSelectedPackage(pkg)}
        >
          <Text style={styles.packageName}>{pkg.product.title}</Text>
          <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
        </TouchableOpacity>
      ))}

      {/* Botão de Compra */}
      <TouchableOpacity 
        style={styles.ctaButton} 
        onPress={handlePurchase}
        disabled={isPurchasing}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.ctaText}>Iniciar Assinatura</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#A0A0A0', textAlign: 'center', marginBottom: 32 },
  featuresContainer: { marginBottom: 32 },
  featureText: { color: '#FFF', fontSize: 16, marginVertical: 6 },
  packageCard: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginVertical: 8, backgroundColor: '#161618' },
  selectedCard: { borderColor: '#FFD700', backgroundColor: '#221F14' },
  packageName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  packagePrice: { color: '#FFD700', fontSize: 18, marginTop: 4 },
  ctaButton: { backgroundColor: '#FFD700', padding: 18, borderRadius: 30, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
```

---

## 3. Arquitetura e Modelagem do Banco de Dados (Firestore)

A segurança e consistência dos privilégios de assinatura são geridas inteiramente no backend via webhooks do gateway de pagamento (RevenueCat/Stripe) que gravam no Firestore. O app **nunca** atualiza o status premium diretamente a partir do cliente por motivos de segurança.

### Modelo de Dados do Usuário (`/users/{userId}`)
```json
{
  "uid": "user_abc123",
  "displayName": "Thales",
  "email": "thales@email.com",
  "createdAt": "2026-06-27T18:00:00Z",
  "subscription": {
    "status": "active",
    "tier": "premium",
    "productId": "bookrats_club_annual",
    "platform": "stripe",
    "expiresAt": "2027-06-27T18:00:00Z",
    "updatedAt": "2026-06-27T18:22:17Z",
    "cancelAtPeriodEnd": false
  }
}
```

### Regras de Segurança do Firestore (`firestore.rules`)
As regras devem validar se o usuário comum não consegue alterar os próprios dados de assinatura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /users/{userId} {
      // O usuário pode ler seus dados e atualizar perfil, mas NÃO pode alterar o nó "subscription"
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId 
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscription']);
    }
  }
}
```

### Processamento de Webhooks (Firebase Cloud Functions)
Quando um pagamento é processado com sucesso, o gateway envia um webhook seguro assinado para uma Cloud Function HTTPS.

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.handlePaymentWebhook = functions.https.onRequest(async (req, res) => {
  const signature = req.headers['x-signature'];
  
  // 1. Validar a assinatura do webhook (Evita spoofing)
  if (!isValidSignature(req.rawBody, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized Signature');
  }

  const event = req.body;
  const userId = event.subscriber_attribute_app_user_id;
  const expiresAt = event.expiration_at;
  const productId = event.product_id;

  if (event.type === 'SUBSCRIBER_STATUS_UPDATED') {
    // 2. Gravar o status de forma transacional no banco
    const userRef = admin.firestore().collection('users').doc(userId);
    
    await userRef.update({
      'subscription.status': 'active',
      'subscription.tier': 'premium',
      'subscription.productId': productId,
      'subscription.expiresAt': expiresAt,
      'subscription.updatedAt': new Date().toISOString()
    });
  }

  return res.status(200).send({ received: true });
});
```

---

## 4. Métodos Enterprise para Escalar até 1 Bilhão de Usuários

Sistemas corporativos com bilhões de requisições por segundo precisam contornar limites físicos de bancos de dados. Um dos principais gargalos do Firestore é o limite de **10.000 gravações por segundo por banco de dados** e **1 gravação por segundo por documento**.

### Caching Distribuído e Redução de Leituras no Firestore
1.  **Camada de Cache no App (Client-side offline sync)**:
    *   Habilitar persistência offline do Firestore (`initializeFirestore(app, { localCache: persistentLocalCache() })`).
    *   Desta forma, se o usuário abrir o app 50 vezes ao dia para ler, o app consome dados locais armazenados no IndexedDB/SQLite local. O Firestore sincroniza apenas o delta (alterações), reduzindo o tráfego em até 95%.
2.  **Validação JWT customizada (Custom Claims)**:
    *   Ao autenticar, o Firebase Auth gera um token JWT. Podemos embutir o privilégio `premium: true` dentro do Custom Claim do usuário usando o Admin SDK.
    *   **Vantagem**: As regras de segurança podem validar o acesso do usuário diretamente a partir do token de autenticação (`request.auth.token.premium == true`) sem precisar ler o documento do usuário no banco em cada requisição. Isso economiza milhões de dólares em leituras do Firestore.
3.  **Bypass de Banco de Dados com CDN para Recursos Estáticos**:
    *   Estatísticas agregadas frias (como rankings semanais ou badges globais) devem ser geradas em background por cronjobs e publicadas em arquivos JSON estáticos no Google Cloud Storage protegidos pelo Cloud CDN.
    *   Em vez de 100 milhões de usuários executarem queries complexas de agregação no Firestore simultaneamente, eles baixam um arquivo leve do CDN mais próximo.

### Evitando Gargalos de Escrita (Write Bottlenecks)
*   **Sharding de Contadores**: Se bilhões de usuários estiverem lendo e atualizando o contador global do ranking do BookRats Club, o documento do ranking travará. Deve-se implementar *Distributed Counters* (dividir o contador em 100 shards/documentos separados e somá-los de forma distribuída).
*   **Fila de Gravação Assíncrona**: O registro de progresso de página de leitura do usuário não precisa ser síncrono. O app enfileira localmente e faz o flush para o servidor em lotes (batch operations) a cada 2 minutos ou ao fechar o livro.

---

## 5. Estratégias Avançadas de Retenção e Monetização (Enterprise)

Corporações globais usam táticas psicológicas e de dados estruturadas para monetizar com eficácia e conter cancelamentos.

### Otimização da Elasticidade de Preço (Localization)
*   **Preços Localizados**: Aplicar paridade de poder de compra (PPP). Um plano de R$ 19,90 no Brasil tem conversão muito maior do que converter diretamente US$ 9.99 (que seria ~R$ 55,00). O RevenueCat gerencia tabelas localizadas automaticamente no Google Play e App Store.
*   **Ancoragem de Preço**: Mostrar três opções:
    1.  Mensal: R$ 24,90/mês
    2.  Anual: R$ 149,90/ano (Equivale a R$ 12,49/mês) — *Destacado como escolha inteligente*
    3.  Semestral: R$ 99,90 (Para fazer a anual parecer ainda mais barata)

### Gestão Automática de Inadimplência (Dunning Management)
*   Se o cartão de crédito do usuário falhar na renovação, não bloquear o acesso imediatamente.
*   **Grace Period (Período de Graça)**: Manter acesso Premium liberado por 7 a 14 dias enquanto o gateway faz tentativas automáticas de cobrança inteligente (usando machine learning para cobrar no melhor horário e dia baseado no banco do usuário).
*   **Notificações Push Transacionais**: Disparar e-mails e pushes automáticos com um link direto para atualizar o cartão de crédito com um clique, sem precisar fazer login novamente.

### Jornada de Cancelamento Interativa (Churn Prevention Funnel)
*   Quando o usuário clica em "Cancelar Assinatura", ele entra em um fluxo interativo em vez de um cancelamento seco de uma linha:
    *   **Pergunta**: "Por que você está nos deixando?" (Opções: Caro, Não uso mais, Falta de recursos).
    *   **Oferta de Retenção Dinâmica**: Se ele escolher "Muito caro", oferecer automaticamente um desconto de 50% nos próximos 3 meses. Se escolher "Não tenho tempo", sugerir pausar a assinatura por 2 meses em vez de cancelar.

---

## 6. Plano de Testes de Carga e Verificação de Escalabilidade

Para garantir que o fluxo de assinatura aguenta picos massivos de acesso (como após um anúncio viral):

### Testes de Carga no Gatilho (Mocking Serverless Loads)
*   Utilizar ferramentas de teste de estresse como o **Artillery** ou **K6** para simular 100.000 requisições simultâneas batendo no endpoint da Cloud Function de Webhooks.
*   Verificar se a taxa de erro HTTP 5xx permanece abaixo de 0.01% e se o tempo de resposta (P99) se mantém inferior a 200ms.

### Testes Unitários de Transação (Regra de Negócio)
*   Testar cenários de corrida (Race Conditions): Usuário assina e cancela no mesmo segundo. O banco deve processar as mensagens na ordem correta usando timestamps lógicos (ex: Sequence ID do RevenueCat).
