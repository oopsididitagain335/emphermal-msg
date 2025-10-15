// app/room/[name]/[id]/page.js
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RoomPage() {
  const { name, id: roomId } = useParams();
  const router = useRouter();
  const roomName = decodeURIComponent(name || '');
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(0);
  const [username, setUsername] = useState('');
  const [text, setText] = useState('');
  const [roomExists, setRoomExists] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!roomId) return;

    const es = new EventSource(`/api/room/${roomId}/sse`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'init' || data.type === 'update') {
        setMessages(data.messages || []);
        setActive(data.active || 0);
        setRoomExists(true);
        setTimeout(scrollToBottom, 100);
      } else if (data.type === 'closed') {
        setRoomExists(false);
        es.close();
      }
    };
    es.onerror = () => {
      setRoomExists(false);
      es.close();
    };

    return () => es.close();
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !text.trim()) return;
    await fetch(`/api/room/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), text: text.trim() })
    });
    setText('');
  };

  const handleClose = async () => {
    if (!confirm('Close this chat for everyone?')) return;
    await fetch(`/api/room/${roomId}`, { method: 'PUT', body: JSON.stringify({ action: 'close' }) });
    router.push('/');
  };

  if (!roomId) return <div>Loading...</div>;
  if (!roomExists) return <div style={{ padding: '2rem' }}><h2>Chat closed</h2></div>;

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>💬 {roomName}</h1>
        <span>👥 {active}</span>
      </div>

      <div style={{ 
        height: '400px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '1rem', 
        overflowY: 'auto',
        backgroundColor: '#fafafa'
      }}>
        {messages.length === 0 ? (
          <p>No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '1rem' }}>
              <strong>{msg.username}:</strong> {msg.text}
              <br />
              <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          style={{ padding: '0.5rem', width: '120px' }}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button type="submit" disabled={!username.trim() || !text.trim()}>
          Send
        </button>
      </form>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <button onClick={handleClose} style={{ background: '#ff4444', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px' }}>
          🔒 Close Chat
        </button>
        <button onClick={() => router.push('/')} style={{ padding: '0.5rem 1rem' }}>
          ← Leave
        </button>
      </div>
    </div>
  );
}
