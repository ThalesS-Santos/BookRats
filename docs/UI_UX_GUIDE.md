# 🎨 Guia de UI/UX e Design System

O BookRats utiliza uma estética "Dark Premium" com toques de "Neon Tech", focada em imersão e legibilidade.

---

## 🌈 Paleta de Cores

Nossas cores estão definidas em `src/ui/constants/colors.js` e integradas ao `tailwind.config.js`:

- **Primary (Rat Green):** `#CCFF00` (Um verde neon vibrante para ações principais e gamificação).
- **Secondary (Dark Blue):** `#0A0E14` (Fundo profundo para o modo escuro).
- **Accent (Electric Blue):** `#00D1FF` (Para links, notificações e badges de sistema).
- **Surface:** `#1A1F26` (Cards, modais e superfícies elevadas).
- **Text:**
  - `High Emphasis`: `#FFFFFF`
  - `Medium Emphasis`: `#A0AEC0`
  - `Disabled`: `#4A5568`

---

## 📐 Tipografia

Utilizamos fontes nativas do sistema para garantir performance e familiaridade:
- **Títulos:** Bold/Black com espaçamento entre letras reduzido para um ar moderno.
- **Corpo:** Regular com altura de linha generosa (1.5x) para facilitar a leitura prolongada de Echoes.

---

## 🧱 Componentes Atômicos

### Avatares (`FastAvatar.js`)
- Suporte a cache de imagem agressivo.
- Fallback para "Pixel Art" se a imagem do usuário falhar.
- Borda neon indicando se o usuário é um "Influenciador".

### Skeletons (`Skeleton.js`)
- Animações de pulso suaves via Reanimated.
- Utilizados em carregamentos de listas de livros e galerias para reduzir o "Layout Shift".

---

## 🕹️ Feedback Sensorial (Haptics)

O design visual é complementado por uma camada tátil:
- **Sucesso:** Vibração suave em cascata (Success Haptic).
- **Seleção:** Clique curto e seco ao navegar por itens (Selection Haptic).
- **Erro:** Vibração tripla de advertência (Warning Haptic).

*Nota: O usuário pode desativar todos os feedbacks táteis nas configurações de acessibilidade.*

---

## 📱 Responsividade e Safe Areas

- Utilizamos `react-native-safe-area-context` em todas as telas para evitar cortes em dispositivos com "Notch" ou "Dynamic Island".
- O layout adapta-se de iPhones pequenos até tablets, usando grids flexíveis do Tailwind.
