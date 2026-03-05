'use client';

import { useState, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import ChatArea from '@/components/Chat/ChatArea';
import Modal from '@/components/UI/Modal';
import ToastContainer from '@/components/UI/Toast';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    updateConversation,
    addMessage,
    updateLastAssistantMessage,
    deleteConversation,
    selectConversation,
  } = useConversations();

  const chatOptions = useMemo(
    () => ({
      onMessageAdded: addMessage,
      onAssistantUpdate: updateLastAssistantMessage,
      onTitleGenerated: (conversationId: string, title: string) => {
        updateConversation(conversationId, { title });
      },
    }),
    [addMessage, updateLastAssistantMessage, updateConversation]
  );

  const { sendMessage, isStreaming } = useChat(chatOptions);

  const handleSendMessage = useCallback(
    (content: string) => {
      let convId = activeConversationId;
      let existingMessages = activeConversation?.messages || [];

      if (!convId) {
        const newConv = createConversation();
        convId = newConv.id;
        existingMessages = [];
      }

      sendMessage(convId, content, existingMessages);
    },
    [activeConversationId, activeConversation, createConversation, sendMessage]
  );

  const handleNewConversation = useCallback(() => {
    selectConversation(null);
  }, [selectConversation]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId) {
      deleteConversation(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteConversation]);

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={setDeleteId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatArea
        conversation={activeConversation}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar conversación?"
        description="Esta acción no se puede deshacer. Se eliminará todo el historial de esta conversación."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
      />
      <ToastContainer />
    </div>
  );
}
