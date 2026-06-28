# Arquitetura de Microtransações e Gamificação Monetizada

Este documento descreve as especificações técnicas, design de banco de dados transacional e táticas de retenção corporativas para o sistema de microtransações (Streak Freeze, moedas virtuais e presentes sociais) do **BookRats**.

---

## 1. Modelo de Negócio e Mecânicas de Gamificação Monetizada

O BookRats utiliza o engajamento e a psicologia de gamificação para criar loops de retenção que podem ser diretamente monetizados através de microtransações recorrentes e consumíveis:

```
[Sequência de Leitura (Streak)] ──(Esqueceu de Ler)──> [Streak Quebrado] 
                                                             │
                                                   (Gatilho Aversão à Perda)
                                                             │
                                                             ▼
                                                [Compra de Streak Freeze]
                                                             │
                                              ┌──────────────┴──────────────┐
                                       (Moeda Virtual)              (Dinheiro Real)
                                              ▼                             ▼
                                    [Gasta 100 RatsCoins]           [Paga R$ 2,90 Direct]
```

### Principais Itens de Venda:
1.  **Streak Freeze (Consumível)**: Protege ou recupera a ofensiva de leitura do usuário caso ele passe um dia sem ler. Baseia-se no gatilho psicológico de **Aversão à Perda** (Kahneman & Tversky).
2.  **Moeda Virtual ("RatsCoins")**: Permite transações in-app mais baratas para o usuário (devido a compras de pacotes de moedas em lote) e reduz taxas bancárias (processando uma única transação de maior valor nas lojas).
3.  **Presentes Sociais (Gifts)**: Enviar mimos virtuais (ex: "Xícara de Café Dourada", "Estante de Ouro") para leitores no feed social pelos seus Echoes brilhantes. O autor do Echo ganha prestígio e pode converter os presentes recebidos de volta em benefícios reais ou dinheiro (cashout de criadores).
4.  **Temas e Avatares Exclusivos (Não-Consumíveis)**: Itens puramente cosméticos para diferenciação social no ranking.

---

## 2. Fluxo e UI/UX no Frontend (React Native + Expo)

A interface deve capitalizar sobre a urgência (ex: "Recupere seu streak de 45 dias nas próximas 2 horas!").

### Telas e Fluxos do Usuário (User Journey)
1.  **A Alerta de Streak Quebrado (Urgência)**:
    *   Assim que o usuário abre o app após falhar em ler no dia anterior, uma animação dramática mostra o fogo do streak se apagando, seguido de uma tela modal explicando que ele pode salvar sua sequência usando um **Streak Freeze**.
2.  **Loja de Customização (Cosmetic Shop)**:
    *   Grelha de cartões em grid contendo badges, fontes exclusivas para leitura e temas de background com pré-visualização instantânea na tela ativa usando estados locais dinâmicos.
3.  **Fluxo de Envio de Presentes nos Echoes**:
    *   Um botão de "Presentear" (ícone de caixa de presente) ao lado dos Claps tradicionais abre um carrossel horizontal de presentes rápidos.
    *   Ao selecionar, executa uma micro-animação de partículas de ouro flutuando pela tela do leitor até o post presenteado.

### Código de Exemplo: Tela de Recuperação de Streak (Frontend)
```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native'; // Para animações dinâmicas do fogo apagando

export default function StreakRecoveryModal({ userStreak, onClose, onRecover }) {
  const [loading, setLoading] = useState(false);

  const purchaseStreakFreeze = async () => {
    setLoading(true);
    try {
      // Executa a transação financeira direta via In-App Purchases (Google Play/App Store)
      const success = await processDirectPayment('streak_freeze_consumable');
      if (success) {
        onRecover(); // Atualiza o estado global de streak no Zustand e fecha
        Alert.alert('Salvo!', 'Seu streak de ' + userStreak + ' dias foi restaurado com sucesso! 🔥');
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível completar a compra do seu Streak Freeze.');
    } finally {
      setLoading(false);
    }
  };

  const processDirectPayment = (productId) => {
    return new Promise(resolve => setTimeout(() => resolve(true), 2000)); // Simulando API nativa de IAP
  };

  return (
    <View style={styles.modalContainer}>
      <LottieView
        source={require('../../assets/animations/fire-extinguish.json')}
        autoPlay
        loop={false}
        style={styles.animation}
      />
      <Text style={styles.warningTitle}>Não perca seu fogo!</Text>
      <Text style={styles.description}>
        Sua sequência de <Text style={styles.highlight}>{userStreak} dias</Text> de leitura diária está prestes a expirar. Use um Streak Freeze para salvá-la!
      </Text>

      <TouchableOpacity 
        style={styles.recoverButton} 
        onPress={purchaseStreakFreeze}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.recoverText}>Salvar meu Streak - R$ 2,90</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Deixar queimar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#0B0B0C', padding: 24, alignItems: 'center', justifyContent: 'center' },
  animation: { width: 180, height: 180 },
  warningTitle: { fontSize: 24, fontWeight: 'bold', color: '#FF453A', marginTop: 20 },
  description: { fontSize: 16, color: '#A0A0A0', textAlign: 'center', marginVertical: 16, paddingHorizontal: 20 },
  highlight: { color: '#FF9500', fontWeight: 'bold' },
  recoverButton: { backgroundColor: '#FF9500', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28, width: '100%', alignItems: 'center', marginTop: 24 },
  recoverText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 16 },
  cancelText: { color: '#8E8E93', fontSize: 14 }
});
```

---

## 3. Estrutura e Modelagem do Banco de Dados (Firestore)

A segurança em microtransações exige registros à prova de falhas para evitar duplicações ou perdas de moedas virtais (double-spending). A arquitetura deve seguir o padrão de **Partidas Dobradas (Double-Entry Bookkeeping)**.

### Coleção `/wallets/{userId}`
Contém o saldo em cache rápido do usuário para exibição rápida no app.

```json
{
  "userId": "user_abc123",
  "balance": 350, // RatsCoins acumulados
  "updatedAt": "2026-06-27T18:22:17Z",
  "version": 42 // Controle de concorrência otimista (optimistic locking)
}
```

### Coleção de Transações de Moedas `/coin_ledger/{txId}`
Todo movimento de moedas deve gerar uma linha de histórico imutável (débito/crédito).

```json
{
  "txId": "tx_coin_55588",
  "userId": "user_abc123",
  "amount": -100, // Débito por compra de item
  "type": "purchase_item",
  "productId": "streak_freeze_consumable",
  "referenceId": "streak_doc_id_999", // Documento relacionado à ação
  "createdAt": "2026-06-27T18:22:17Z"
}
```

### Proteção de Integridade com Transações Firestore
O código abaixo garante de forma atômica que o usuário não consiga comprar se o saldo mudar no meio do processo (ex: ele tenta clicar rápido no botão 5 vezes de forma simultânea):

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

exports.buyStreakFreeze = async (userId) => {
  const walletRef = db.collection('wallets').doc(userId);
  const ledgerRef = db.collection('coin_ledger').doc();
  const userRef = db.collection('users').doc(userId);

  return db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists) {
      throw new Error("Carteira não inicializada.");
    }

    const currentBalance = walletDoc.data().balance;
    const price = 100; // Custo de 1 Streak Freeze = 100 RatsCoins

    if (currentBalance < price) {
      throw new Error("Saldo de moedas insuficiente.");
    }

    // 1. Debitar da carteira controlando concorrência
    transaction.update(walletRef, {
      balance: currentBalance - price,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Registrar no Ledger imutável de transações
    transaction.set(ledgerRef, {
      userId: userId,
      amount: -price,
      type: "purchase_item",
      productId: "streak_freeze_consumable",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Acrescentar um item ao inventário de itens do usuário
    transaction.update(userRef, {
      'inventory.streakFreezes': admin.firestore.FieldValue.increment(1)
    });
  });
};
```

---

## 4. Métodos Enterprise para Suportar Bilhões de Transações Simultâneas

A concorrência em sistemas de transações massivas (bilhões de usuários) pode criar sérios gargalos no banco. O Firestore impõe limites em gravações em lote e transações bloqueantes.

### Consistência Eventual vs. Consistência Forte (Strong vs. Eventual Consistency)
1.  **Saldo Financeiro (Consistência Forte)**:
    *   Toda compra que envolve dinheiro real ou transação direta de saldo deve passar por transações ACID estritas no Firestore/Cloud Spanner para garantir integridade matemática absoluta de 100%.
2.  **Visualizações Sociais e Rankings de Gamificação (Consistência Eventual)**:
    *   Se o usuário ganha 10 pontos de experiência (XP) por usar um streak freeze, atualizar o ranking global imediatamente em tempo real derrubará o banco de dados sob carga intensa.
    *   **Solução**: O ganho de XP é empurrado em background para um cache Redis local e persistido em blocos assíncronos no Firestore de 10 em 10 minutos por um worker centralizado. O usuário vê seu progresso na hora localmente (optimistic UI update), mas o restante da rede global sincroniza de forma eventual.

### Redução de Custo de In-App Purchases (Aggregations)
*   **Encapsulamento de Transações de Cartão de Crédito**: Para pagamentos móveis, as taxas fixas da Apple/Google por transação (ex: US$ 0.15 + 30%) inviabilizam vender itens de R$ 0,50 diretamente no cartão. A venda de **pacotes de moedas** (ex: compre 1000 RatsCoins por R$ 25,00) centraliza a transação real do cartão e permite transações de micro-itens virtuais internamente sem taxas financeiras por cada clique do leitor.

---

## 5. Estratégias Avançadas de Monetização Corporativa (Urgência & Preço)

A microtransação opera sob gatilhos emocionais rápidos que requerem calibração contínua dos dados analíticos.

### Precificação Não Linear de Pacotes de Moedas
Projetar pacotes de moedas de forma que sobrem frações inúteis para forçar o usuário a comprar outro pacote (tática clássica de jogos corporativos, ex: League of Legends, Fortnite):
*   Item unitário custa **120 moedas**.
*   Menor pacote à venda na loja: **100 moedas**.
*   Segundo menor pacote: **250 moedas**.
*   **Resultado**: O usuário é forçado a comprar o pacote de 250 moedas para adquirir o item, sobrando 130 moedas na carteira, o que gera o gatilho de que ele tem moedas "paradas" e deve comprar mais moedas para adquirir outra coisa.

### Push de Aversão à Perda Geolocalizado
Se o leitor não registrou leitura no dia até às 21h00, o servidor envia um push personalizado e urgente:
*   *“Thales, seu streak de 98 dias está prestes a congelar! Abra o livro 'O Alquimista' agora para garantir o seu dia ou use um de seus 2 Streak Freezes acumulados.”*
*   Este canal ativo de notificação reduz drasticamente a taxa de abandono do app por quebra acidental de streak.
