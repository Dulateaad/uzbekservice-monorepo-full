import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, MapPin, Mic, Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTelegram } from '../hooks/useTelegram';
import { onChatMessages, sendChatMessage, CHAT_TEMPLATES } from '../services/firebase';
import type { ChatMessage, QuickTemplate } from '../types';

export default function ChatPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, userId } = useStore();
  const { tg } = useTelegram();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();

    // Firestore real-time чат (заменяет Socket.io)
    let unsubChat: (() => void) | undefined;
    if (tripId) {
      setLoading(true);
      unsubChat = onChatMessages(tripId, (msgs) => {
        setMessages(msgs);
        setLoading(false);
      });
    }

    tg?.BackButton?.show();
    tg?.BackButton?.onClick(() => navigate(-1));
    return () => {
      tg?.BackButton?.hide();
      unsubChat?.();
    };
  }, [tripId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function loadTemplates() {
    const role = user?.role || 'CLIENT';
    const t = CHAT_TEMPLATES[role as keyof typeof CHAT_TEMPLATES] || [];
    setTemplates(t);
  }

  async function handleSend(content?: string) {
    const text = content || input.trim();
    if (!text || !tripId || !userId) return;

    try {
      setSending(true);
      await sendChatMessage(tripId, userId, { type: 'TEXT', content: text });
      setInput('');
      tg?.HapticFeedback?.impactOccurred('light');
    } catch {} finally {
      setSending(false);
    }
  }

  async function handleSendLocation() {
    if (!tripId || !userId || !navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          setSending(true);
          await sendChatMessage(tripId, userId, {
            type: 'LOCATION',
            content: 'Моя геопозиция',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          tg?.HapticFeedback?.impactOccurred('light');
        } catch {} finally {
          setSending(false);
        }
      }
    );
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleInputChange(value: string) {
    setInput(value);
    // typing indicator removed (Firestore real-time doesn't need it)
  }

  return (
    <div className="h-full flex flex-col bg-tg-bg safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft size={24} className="text-tg-text" />
        </button>
        <div className="flex-1">
          <h3 className="font-semibold text-tg-text text-sm">Чат поездки</h3>
        </div>
      </div>

      {/* Quick templates */}
      {templates.length > 0 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSend(t.text)}
              className="whitespace-nowrap bg-tg-secondaryBg text-tg-text text-xs px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              {t.text}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-tg-hint text-sm">Начните общение</p>
            <p className="text-tg-hint text-xs mt-1">Без звонков. Только чат.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <button
            onClick={handleSendLocation}
            className="w-10 h-10 rounded-full bg-tg-secondaryBg flex items-center justify-center shrink-0"
          >
            <MapPin size={18} className="text-tg-hint" />
          </button>

          <div className="flex-1 bg-tg-secondaryBg rounded-2xl px-4 py-2 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-tg-text resize-none max-h-20"
            />
          </div>

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              input.trim()
                ? 'bg-primary-500 text-white'
                : 'bg-tg-secondaryBg text-tg-hint'
            }`}
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  if (message.type === 'SYSTEM') {
    return (
      <div className="text-center">
        <span className="text-xs text-tg-hint bg-tg-secondaryBg px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${
          isMine
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-tg-secondaryBg text-tg-text rounded-bl-md'
        }`}
      >
        {message.type === 'LOCATION' ? (
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span className="text-sm underline">Геопозиция</span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <p className={`text-[10px] mt-0.5 ${isMine ? 'text-primary-100' : 'text-tg-hint'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
