# 📐 Arquitetura do Sistema

O BookRats segue uma arquitetura modular e baseada em Slices, focada em escalabilidade e facilidade de teste.

## 📂 Estrutura de Pastas

```text
src/
├── core/             # 🔥 O "Cérebro" do App
│   ├── api/          # Comunicação com Firebase e APIs externas
│   ├── firebase/     # Configuração singleton do Firebase
│   ├── services/     # Lógica de domínio e utilitários complexos (ex: Logger)
│   ├── store/        # Estado Global (Zustand Slices)
│   └── types/        # Definições de tipos (TypeScript-ish)
├── hooks/            # Hooks de lógica reutilizável
├── store/            # Stores legados e UI-specific (Popup, Theme)
├── ui/               # 🎨 Visual e Interface
│   ├── assets/       # Imagens e ícones locais
│   ├── components/   # Átomos, Moléculas e Organismos (Atomic Design)
│   ├── constants/    # Cores, Badges e Tokens de design
│   ├── navigation/   # Configuração de rotas (Stack/Tabs)
│   └── screens/      # Telas completas do sistema
└── utils/            # Funções utilitárias simples (Haptics, Time, etc.)
```

---

## 🧠 Gerenciamento de Estado (Zustand Slices)

Utilizamos o padrão de **Slices** do Zustand para evitar um arquivo de store gigante e facilitar a separação de responsabilidades.

- **`authSlice`:** Gerencia sessão, login social e estado do usuário.
- **`librarySlice`:** Cuida da estante do usuário, progresso de leitura e integridade dos dados.
- **`socialSlice`:** Notificações, amizades e mensagens de grupos.
- **`gamificationSlice`:** Cálculos de streaks, conquistas e badges.

### Fluxo de Dados:
1. A **UI** dispara uma ação (ex: `addBook`).
2. A **Slice** chama o método correspondente em `core/api`.
3. O **Firebase** responde e a **Slice** atualiza o estado global.
4. A **UI** reage à mudança de estado automaticamente.

---

## 🔌 Camada de API e Firebase

- **apiClient.js:** Um wrapper sobre o `fetch` nativo para chamadas REST (como Google Books API), com interceptores de erro e logs centralizados.
- **firebase.js:** Implementa um padrão Singleton para garantir que o Firebase seja inicializado apenas uma vez, evitando erros de "Duplicate App" em desenvolvimento.
- **Segurança:** Todas as chamadas ao Firestore passam por regras de segurança rigorosas (Cloud Firestore Rules), garantindo que um usuário não possa ler/escrever dados de outro sem permissão.

---

## 📋 Serviços e Cross-Cutting Concerns

### Logger Centralizado
Utilizamos o `Logger.js` em vez de `console.log` para:
- Diferenciar ambientes (Dev vs Prod).
- Evitar vazamento de dados sensíveis (PII) em logs de produção.
- Facilitar a integração futura com ferramentas como Sentry ou Firebase Crashlytics.

### Sistema de Ecos (Echoes)
A lógica de filtragem anti-spoiler é processada tanto no backend (regras) quanto no frontend (filtros do `socialSlice`), garantindo uma experiência de usuário fluida e segura.
