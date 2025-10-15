// app/room/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id ? decodeURIComponent(params.id) : '';
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [username, setUsername] = useState('');
  const [text, setText] = useState('');

  // Join room on mount
  useEffect(() => {
    if (!roomId) return;

    // Simulate connection ID (in real app, use WebSocket or unique ID)
    const connectionId = Date.now().toString();

    // Join room
    fetch(`/api/room/${encodeURIComponent(roomId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', connectionId }),
    });

    // Cleanup on unmount
    return () => {
      fetch(`/api/room/${encodeURIComponent(roomId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', connectionId }),
      });
    };
  }, [roomId]);

  // Load messages
  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/room/${encodeURIComponent(roomId)}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setActiveUsers(data.activeUsers || 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !text.trim()) return;

    const res = await fetch(`/api/room/${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), text: text.trim() }),
    });

    if (res.ok) {
      setText('');
    }
  };

  if (!roomId) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Room: {roomId}</h1>
      <p>Active users: {activeUsers}</p>

      <div style={{ marginTop: '1rem', height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '0.5rem' }}>
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{msg.username}:</strong> {msg.text}
              <br />
              <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          style={{ padding: '0.5rem', fontSize: '1rem', width: '120px' }}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ padding: '0.5rem', fontSize: '1rem', flex: 1 }}
        />
        <button
          type="submit"
          disabled={!username.trim() || !text.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </form>

      <button
        onClick={() => router.push('/')}
        style={{ marginTop: '1rem', padding: '0.5rem', fontSize: '1rem' }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
