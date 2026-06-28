# Engenharia de Anúncios In-App (AdMob e Redes de Mediação)

Este documento apresenta a arquitetura técnica, segurança de recompensa via servidor (Server-Side Verification - SSV) e estratégias de maximização de receita (eCPM) por meio de publicidade in-app integrada ao ecossistema do **BookRats**.

---

## 1. Modelo de Negócio e Tipos de Anúncios

Para monetizar a base de usuários não pagantes (que compõem, em média, 90% a 95% do total de usuários de um app mobile), implementamos anúncios digitais direcionados via redes de anúncios programmaticos:

```
                  ┌──> [Usuário Premium] ──> [Bypass de Anúncios (Sem Ads - Zero Atrito)]
                  │
[Entrada no App] ─┤
                  │
                  └──> [Usuário Gratuito] ──> [Carrega Anúncios Programados]
                                                   ├── Banner (Visualização Contínua)
                                                   ├── Intersticial (Transições de Fluxo)
                                                   └── Vídeo Premiado (Rewarded - Troca por Itens)
```

### Formatos de Anúncios Utilizados:
1.  **Banners**: Pequenos anúncios retangulares fixados na parte inferior da tela do feed social ou da biblioteca. Baixo eCPM (Rendimento por Mil Impressões), mas de exibição constante.
2.  **Intersticiais**: Anúncios de tela cheia que interrompem a experiência em pontos de transição lógica (ex: ao fechar um livro após registrar leitura ou ao entrar em um grupo novo). Alto eCPM, mas devem ser limitados para evitar atrito exagerado.
3.  **Rewarded Ads (Vídeos Premiados)**: O usuário escolhe assistir a um vídeo de 30 segundos em troca de um benefício claro dentro do app (ex: "Assista a este vídeo para recuperar seu streak de hoje gratuitamente" ou "Assista para liberar 1 slot de livro extra na biblioteca"). Alta taxa de engajamento e eCPM máximo.

---

## 2. Fluxo e UI/UX no Frontend (React Native + Expo)

A integração visual dos anúncios no BookRats deve seguir as políticas da Google Play e App Store. O principal ponto de atenção é **evitar cliques acidentais** (o que resulta em bloqueio de conta de AdMob).

### Regras Visuais e Boas Práticas de UI:
*   **Margens Claras**: Banners nunca devem ficar sobrepostos a botões ativos de navegação. Deve haver um divisor visível separando o conteúdo do app do banner publicitário.
*   **Controle de Estados**: Se o usuário se tornar assinante Premium no meio da sessão, o app deve instantaneamente desmontar os componentes de anúncio e invalidar as instâncias de carregamento em memória da SDK de ads.
*   **Carregamento Assíncrono (Pre-fetching)**: Vídeos premiados e intersticiais demoram a carregar. A SDK deve fazer o download do anúncio em segundo plano (cache local do dispositivo) no início da jornada para que, quando o usuário clicar no botão, a exibição seja **instantânea**.

### Código de Exemplo: Integração de Vídeo Premiado (Frontend)
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// ID de teste para desenvolvimento (Substituir por ID real em produção)
const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9999999999999999/1111111111';

const rewardedAd = RewardedAd.createForAdUnit(adUnitId, {
  requestNonPersonalizedAdsOnly: false, // Habilita ads personalizados com base na LGPD/GDPR
});

export default function RewardAdButton({ onRewardEarned, userCoins }) {
  const [loaded, setLoaded] = useState(false);
  const [loadingAd, setLoadingAd] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setLoaded(true);
      setLoadingAd(false);
    });

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        // Callback acionado localmente (A recompensa real deve ser validada no backend)
        onRewardEarned(reward.amount);
        Alert.alert('Parabéns!', `Você assistiu ao vídeo e ganhou ${reward.amount} RatsCoins! 🎉`);
      }
    );

    // Pré-carrega o anúncio em background
    rewardedAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, [onRewardEarned]);

  const showAd = () => {
    if (loaded) {
      rewardedAd.show();
      setLoaded(false); // Reseta após exibição
      rewardedAd.load(); // Carrega o próximo em background
    } else {
      setLoadingAd(true);
      rewardedAd.load();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.balanceText}>Seu saldo: {userCoins} RatsCoins</Text>
      <TouchableOpacity 
        style={styles.adButton} 
        onPress={showAd}
        disabled={loadingAd}
      >
        {loadingAd ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.adButtonText}>🎬 Ganhar +15 Moedas Grátis</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#1C1C1E', borderRadius: 12, alignItems: 'center' },
  balanceText: { color: '#FFF', fontSize: 14, marginBottom: 12 },
  adButton: { backgroundColor: '#FFD700', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20 },
  adButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
```

---

## 3. Segurança e Modelagem no Banco de Dados (Firestore)

A principal vulnerabilidade em apps com vídeos premiados é o "spoofing" de requisições client-side, onde o usuário finge que assistiu ao anúncio alterando o estado do app local ou enviando requisições falsas de crédito. 

Para anular essa vulnerabilidade em escala de milhões de usuários, utilizamos **Server-Side Verification (SSV)** do Google AdMob.

```
[Dispositivo App] ──> [Exibe Vídeo de Anúncio] ──> [Servidor AdMob]
                                                       │
                                            (Dispara Webhook SSV com Signature)
                                                       │
                                                       ▼
[Firestore Database] <── [Atualiza Saldo] <── [Firebase Cloud Function]
```

### Fluxo de Validação de Recompensa (Cloud Function HTTPS)
O Google AdMob faz um disparo HTTPS contendo a assinatura criptográfica e parâmetros como o `app_user_id`. O backend valida a criptografia antes de dar saldo.

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const axios = require('axios'); // Para buscar chaves públicas da Google AdMob

exports.validateAdmobReward = functions.https.onRequest(async (req, res) => {
  const queryParams = req.query;
  const signature = req.query.signature;
  const keyId = req.query.key_id;

  // 1. Baixar as chaves públicas da Google AdMob (com cache em memória para velocidade)
  const adMobPublicKeys = await fetchAdMobKeys();
  const publicKeyPem = adMobPublicKeys[keyId];

  if (!publicKeyPem) {
    return res.status(400).send('Chave de verificação expirada.');
  }

  // 2. Recriar a string de dados assinada
  const rawQueryString = req.url.substring(req.url.indexOf('?') + 1).replace(`&signature=${signature}`, '');
  
  // 3. Validar a assinatura RSA-SHA256
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(rawQueryString);
  const isValid = verifier.verify(publicKeyPem, signature, 'base64');

  if (!isValid) {
    return res.status(401).send('Assinatura inválida detectada.');
  }

  const userId = queryParams.user_id;
  const rewardAmount = parseInt(queryParams.reward_amount, 10);

  // 4. Creditar a transação de forma atômica e segura no Firestore
  const walletRef = admin.firestore().collection('wallets').doc(userId);
  await walletRef.update({
    balance: admin.firestore.FieldValue.increment(rewardAmount),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return res.status(200).send('Reward Credited');
});
```

---

## 4. Métodos Enterprise para Suportar Bilhões de Chamadas

Sob alta carga, requisições de anúncios ocorrem continuamente. Os servidores de mediação precisam responder em milissegundos para evitar a latência na exibição do anúncio.

### Otimização e Cache de Limite Diário (Ad Capping)
Para evitar abusos onde robôs ou usuários mal-intencionados assistem a 10.000 anúncios seguidos para inflacionar moedas no app:
*   **Frequecy Capping via Redis**:
    *   Definir um limite de, no máximo, 5 vídeos premiados por usuário a cada 24 horas.
    *   O controle de cota é executado em **Redis (GCP Memorystore)** usando chaves baseadas no ID do usuário e um contador com tempo de expiração de 1 dia (`EXPIRE user_id_ad_count 86400`). A validação no Redis demora menos de **2ms** e não consome recursos de gravação no Firestore.
*   **Lazy Loading de Banners**: Banners só devem ser inicializados e baixados quando a seção que os contém de fato entrar na área de rolagem visível na tela (Viewport dynamic load).

---

## 5. Estratégias Avançadas de Monetização Corporativa (Mediação e eCPM)

Grandes empresas globais nunca dependem de uma única rede de anúncios (como apenas o AdMob padrão), pois isso reduz a concorrência pelo espaço e abaixa as taxas de eCPM.

### Otimização por Mediação Dinâmica (Real-Time Bidding)
*   **Mediação (Ex: AppLovin MAX / Unity LevelPlay)**: Integra-se um SDK unificado de mediação. Quando o app solicita um anúncio, o SDK realiza um leilão instantâneo em tempo real entre várias redes gigantes (AdMob, Meta Audience Network, Unity Ads, Mintegral, IronSource). Quem pagar mais caro pela exibição naquele segundo exibe o anúncio. Isso aumenta a receita em até 40%.
*   **Segmentação de eCPM por País (Preços de Tráfego)**:
    *   Usuários dos EUA (Tier 1) possuem eCPM de até US$ 30,00 por mil visualizações de vídeo.
    *   Usuários da América Latina possuem eCPMs menores (~US$ 3,00).
    *   O algoritmo de mediação deve segmentar dinamicamente os anúncios, exibindo intersticiais apenas para usuários de alto rendimento que não possuem propensão de compra de planos premium (minnows/free-tier), enquanto usuários com alto engajamento em compras são direcionados a promoções de IAPs diretas.
