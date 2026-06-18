/**
 * Social Interactions — Fluxos Ponta a Ponta
 *
 * Testa os fluxos completos de interação social, simulando sequências reais
 * de operações como: Pedido de Amizade → Aceite, → Rejeição, subscrições
 * em tempo real e ciclo de notificações.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
  subscribeToSentRequests,
  subscribeToReceivedRequests,
  subscribeToFriends,
  createNotification,
  subscribeToNotifications,
  markNotificationAsRead,
} from '@core/api/social';

// --- Mocks locais (sobrescrevem jest.setup.js) ---

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  documentId: jest.fn(),
  arrayRemove: jest.fn(),
  arrayUnion: jest.fn(),
  increment: jest.fn(),
  runTransaction: jest.fn(),
  collectionGroup: jest.fn(),
}));

jest.mock('@core/firebase/firebase', () => ({ db: {} }));

// --- Fixtures ---

const ALICE = { uid: 'alice-uid', name: 'Alice', avatar: null };
const BOB = { uid: 'bob-uid', name: 'Bob', avatar: null };
const CAROL = { uid: 'carol-uid', name: 'Carol', avatar: null };
const REQUEST_ID = 'friendship-req-001';

// ---------------------------------------------------------------------------
describe('Social Interactions — Fluxos Ponta a Ponta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue({ id: 'mock-collection-ref' });
    doc.mockReturnValue({ id: 'mock-doc-ref' });
    getDoc.mockResolvedValue({ exists: () => false });
    updateDoc.mockResolvedValue();
    addDoc.mockResolvedValue({ id: 'new-doc-id' });
    deleteDoc.mockResolvedValue();
    getDocs.mockResolvedValue({ empty: true, docs: [] });
  });

  // =========================================================================
  describe('Pedido de Amizade → Aceite', () => {
    it('envia pedido criando documento com status pending', async () => {
      getDocs.mockResolvedValueOnce({ empty: true });

      await sendFriendRequest(ALICE.uid, BOB.uid);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderId: ALICE.uid,
          receiverId: BOB.uid,
          status: 'pending',
        }),
      );
    });

    it('aceita pedido atualizando status para accepted', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: ALICE.uid, receiverId: BOB.uid }),
      });

      await acceptFriendRequest(REQUEST_ID, BOB.uid, BOB.name, BOB.avatar);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'accepted' },
      );
    });

    it('aceite envia notificação para o solicitante', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: ALICE.uid, receiverId: BOB.uid }),
      });

      await acceptFriendRequest(REQUEST_ID, BOB.uid, BOB.name, BOB.avatar);

      // NotificationService.sendNotification chama addDoc internamente
      expect(addDoc).toHaveBeenCalled();
    });

    it('não cria pedido duplicado se já existe', async () => {
      getDocs.mockResolvedValueOnce({ empty: false });

      await sendFriendRequest(ALICE.uid, BOB.uid);

      expect(addDoc).not.toHaveBeenCalled();
    });

    it('fluxo completo em sequência: envio → aceite → updateDoc chamado uma vez', async () => {
      // Passo 1: Alice envia pedido
      getDocs.mockResolvedValueOnce({ empty: true });
      await sendFriendRequest(ALICE.uid, BOB.uid);
      expect(addDoc).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      updateDoc.mockResolvedValue();
      addDoc.mockResolvedValue({ id: 'notif-id' });

      // Passo 2: Bob aceita
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: ALICE.uid, receiverId: BOB.uid }),
      });
      await acceptFriendRequest(REQUEST_ID, BOB.uid, BOB.name, BOB.avatar);

      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'accepted' },
      );
    });

    it('aceite retorna silenciosamente se documento não existe', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(
        acceptFriendRequest(REQUEST_ID, BOB.uid, BOB.name, BOB.avatar),
      ).resolves.toBeUndefined();

      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  describe('Pedido de Amizade → Rejeição', () => {
    it('rejeita pedido atualizando status para rejected', async () => {
      await rejectFriendRequest(REQUEST_ID);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'rejected' },
      );
    });

    it('rejeição não cria notificação', async () => {
      await rejectFriendRequest(REQUEST_ID);

      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).not.toHaveBeenCalled();
    });

    it('lança erro se updateDoc falhar na rejeição', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(rejectFriendRequest(REQUEST_ID)).rejects.toThrow();
    });
  });

  // =========================================================================
  describe('Remoção de Amizade', () => {
    it('remove documento da direção sender→receiver', async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [{ ref: 'ref-a-b' }] })
        .mockResolvedValueOnce({ docs: [] });

      await removeFriendship(ALICE.uid, BOB.uid);

      expect(deleteDoc).toHaveBeenCalledWith('ref-a-b');
    });

    it('remove documentos em ambas as direções quando existem', async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [{ ref: 'ref-a-b' }] })
        .mockResolvedValueOnce({ docs: [{ ref: 'ref-b-a' }] });

      await removeFriendship(ALICE.uid, BOB.uid);

      expect(deleteDoc).toHaveBeenCalledTimes(2);
      expect(deleteDoc).toHaveBeenCalledWith('ref-a-b');
      expect(deleteDoc).toHaveBeenCalledWith('ref-b-a');
    });

    it('não chama deleteDoc se nenhuma friendship existe', async () => {
      getDocs
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });

      await removeFriendship(ALICE.uid, BOB.uid);

      expect(deleteDoc).not.toHaveBeenCalled();
    });

    it('lança erro se getDocs falhar', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(removeFriendship(ALICE.uid, BOB.uid)).rejects.toThrow();
    });
  });

  // =========================================================================
  describe('Subscrições em Tempo Real', () => {
    it('subscribeToSentRequests dispara callback com pedidos enviados', () => {
      const onUpdate = jest.fn();
      const mockDocs = [
        {
          id: REQUEST_ID,
          data: () => ({
            senderId: ALICE.uid,
            receiverId: BOB.uid,
            status: 'pending',
          }),
        },
      ];

      onSnapshot.mockImplementationOnce((_q, callback) => {
        callback({ docs: mockDocs });
        return jest.fn();
      });

      const unsub = subscribeToSentRequests(ALICE.uid, onUpdate);

      expect(onUpdate).toHaveBeenCalledWith([
        {
          id: REQUEST_ID,
          senderId: ALICE.uid,
          receiverId: BOB.uid,
          status: 'pending',
        },
      ]);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToReceivedRequests dispara callback com pedidos recebidos', () => {
      const onUpdate = jest.fn();
      const mockDocs = [
        {
          id: 'req-carol',
          data: () => ({
            senderId: CAROL.uid,
            receiverId: ALICE.uid,
            status: 'pending',
          }),
        },
      ];

      onSnapshot.mockImplementationOnce((_q, callback) => {
        callback({ docs: mockDocs });
        return jest.fn();
      });

      subscribeToReceivedRequests(ALICE.uid, onUpdate);

      expect(onUpdate).toHaveBeenCalledWith([
        {
          id: 'req-carol',
          senderId: CAROL.uid,
          receiverId: ALICE.uid,
          status: 'pending',
        },
      ]);
    });

    it('subscribeToFriends combina IDs de amigos de ambas as direções', () => {
      const onUpdate = jest.fn();

      // Primeira chamada onSnapshot = pedidos enviados aceitos
      onSnapshot
        .mockImplementationOnce((_q, callback) => {
          callback({ docs: [{ data: () => ({ receiverId: BOB.uid }) }] });
          return jest.fn();
        })
        // Segunda chamada onSnapshot = pedidos recebidos aceitos
        .mockImplementationOnce((_q, callback) => {
          callback({ docs: [{ data: () => ({ senderId: CAROL.uid }) }] });
          return jest.fn();
        });

      const unsub = subscribeToFriends(ALICE.uid, onUpdate);

      const lastCall = onUpdate.mock.calls.at(-1)[0];
      expect(lastCall).toContain(BOB.uid);
      expect(lastCall).toContain(CAROL.uid);
      expect(typeof unsub).toBe('function');
    });

    it('subscribeToSentRequests retorna função unsubscribe', () => {
      const mockUnsub = jest.fn();
      onSnapshot.mockReturnValueOnce(mockUnsub);

      const unsub = subscribeToSentRequests(ALICE.uid, jest.fn());

      expect(unsub).toBe(mockUnsub);
    });
  });

  // =========================================================================
  describe('Ciclo de Notificações', () => {
    it('subscribeToNotifications dispara callback com notificações', () => {
      const onUpdate = jest.fn();
      const mockNotifs = [
        {
          id: 'notif-001',
          data: () => ({
            type: 'FRIEND_ACCEPT',
            senderId: BOB.uid,
            read: false,
          }),
        },
      ];

      onSnapshot.mockImplementationOnce((_q, callback) => {
        callback({ docs: mockNotifs });
        return jest.fn();
      });

      const unsub = subscribeToNotifications(ALICE.uid, onUpdate);

      expect(onUpdate).toHaveBeenCalledWith([
        { id: 'notif-001', type: 'FRIEND_ACCEPT', senderId: BOB.uid, read: false },
      ]);
      expect(typeof unsub).toBe('function');
    });

    it('markNotificationAsRead atualiza flag read para true', async () => {
      await markNotificationAsRead(ALICE.uid, 'notif-001');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { read: true },
      );
    });

    it('createNotification salva documento na sub-collection do usuário', async () => {
      await createNotification(
        BOB.uid,
        'FRIEND_REQUEST',
        { uid: ALICE.uid, displayName: ALICE.name },
        null,
        null,
      );

      expect(addDoc).toHaveBeenCalled();
    });
  });

  // =========================================================================
  describe('Cenário Completo: Dois usuários se tornam amigos', () => {
    it('Alice e Bob percorrem o fluxo completo pedido → aceite → notificação', async () => {
      // FASE 1 — Alice envia pedido para Bob
      getDocs.mockResolvedValueOnce({ empty: true });
      await sendFriendRequest(ALICE.uid, BOB.uid);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderId: ALICE.uid,
          receiverId: BOB.uid,
          status: 'pending',
        }),
      );

      // FASE 2 — Bob recebe o pedido via listener
      const receivedRequests = [];
      onSnapshot.mockImplementationOnce((_q, callback) => {
        callback({
          docs: [
            {
              id: REQUEST_ID,
              data: () => ({
                senderId: ALICE.uid,
                receiverId: BOB.uid,
                status: 'pending',
              }),
            },
          ],
        });
        return jest.fn();
      });
      subscribeToReceivedRequests(BOB.uid, data =>
        receivedRequests.push(...data),
      );

      expect(receivedRequests).toHaveLength(1);
      expect(receivedRequests[0]).toMatchObject({
        senderId: ALICE.uid,
        status: 'pending',
      });

      // FASE 3 — Bob aceita o pedido
      jest.clearAllMocks();
      updateDoc.mockResolvedValue();
      addDoc.mockResolvedValue({ id: 'notif-id' });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ senderId: ALICE.uid, receiverId: BOB.uid }),
      });
      await acceptFriendRequest(REQUEST_ID, BOB.uid, BOB.name, BOB.avatar);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'accepted' },
      );

      // FASE 4 — Alice recebe notificação de aceite via listener
      const notifications = [];
      onSnapshot.mockImplementationOnce((_q, callback) => {
        callback({
          docs: [
            {
              id: 'notif-accept',
              data: () => ({
                type: 'FRIEND_ACCEPT',
                senderId: BOB.uid,
                read: false,
              }),
            },
          ],
        });
        return jest.fn();
      });
      subscribeToNotifications(ALICE.uid, data =>
        notifications.push(...data),
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'FRIEND_ACCEPT',
        senderId: BOB.uid,
        read: false,
      });

      // FASE 5 — Alice marca notificação como lida
      jest.clearAllMocks();
      updateDoc.mockResolvedValue();

      await markNotificationAsRead(ALICE.uid, 'notif-accept');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { read: true },
      );
    });

    it('cenário de rejeição: Bob rejeita pedido de Alice sem notificação', async () => {
      // FASE 1 — Alice envia pedido
      getDocs.mockResolvedValueOnce({ empty: true });
      await sendFriendRequest(ALICE.uid, BOB.uid);
      expect(addDoc).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      updateDoc.mockResolvedValue();

      // FASE 2 — Bob rejeita
      await rejectFriendRequest(REQUEST_ID);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'rejected' },
      );
      // Sem notificação na rejeição
      expect(addDoc).not.toHaveBeenCalled();
    });
  });
});
