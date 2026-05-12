import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, getChatMessages } from '../services/chat';

const WS_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'ws://localhost:8000';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export function usePartyChat(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const loadHistory = useCallback(async () => {
    if (!roomId) return;
    setIsLoadingHistory(true);
    try {
      const data = await getChatMessages(roomId, 1);
      setMessages(data.results.reverse());
    } catch (err) {
      console.error('Erreur historique chat :', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    loadHistory();

    const token = getCookie('access_token');
    const wsUrl = `${WS_BASE_URL}/ws/chat/${roomId}/${token ? `?token=${token}` : ''}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        const newMsg = data.type === 'chat_message' ? data.message : data;

        if (newMsg && newMsg.content) {
          setMessages(prev => [...prev, newMsg]);
        }
      } catch (err) {
        console.error('Erreur parsing WS', err);
      }
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [roomId, loadHistory]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    } else {
      console.warn('WebSocket non connecté.');
    }
  }, []);

  return {
    messages,
    isConnected,
    isLoadingHistory,
    sendMessage,
  };
}
