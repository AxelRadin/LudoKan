import { useState, useEffect, useCallback, useRef } from 'react';
import { type ChatMessage, getChatMessages } from '../services/chat';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const regex = new RegExp(`(^| )${name}=([^;]+)`);
  const match = regex.exec(document.cookie);
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
      setMessages([...data.results].reverse());
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
    const tokenQuery = token ? `?token=${token}` : '';
    const wsUrl = `${WS_BASE_URL}/ws/chat/${roomId}/${tokenQuery}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        const newMsg = data.type === 'chat_message' ? data.message : data;

        if (newMsg?.content) {
          setMessages(prev => [...prev, newMsg]);
        }
      } catch (err) {
        console.error('Erreur parsing WS', err);
      }
    };

    return () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [roomId, loadHistory]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    } else {
      console.warn('WebSocket non connecté.');
    }
  }, []);

  return { messages, isConnected, isLoadingHistory, sendMessage };
}
