// app/room/[name]/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { name, id } = params;
  const roomName = name ? decodeURIComponent(name) : '';
  const roomId = id || '';

  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [username, setUsername] = useState('');
  const [text, setText] = useState('');
  const [roomExists, setRoomExists] = useState(true); // Track if room still exists

  useEffect(() => {
    if (!roomId) return;

    const storageKey = `conn_${roomId}`;
    let connectionId = sessionStorage.getItem(storageKey);
    if (!connectionId) {
      connectionId = crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem(storageKey, connectionId);
    }

    // Join the room
    fetch(`/api/room/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', connectionId }),
    });

    const handleBeforeUnload = () => {
      fetch(`/api/room/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', connectionId }),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      fetch(`/api/room/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', connectionId }),
      });
    };
  }, [roomId]);

  // Poll room data (messages, users, existence)
  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`);
        if (res.status === 404) {
          setRoomExists(false);
          clearInterval(interval);
          return;
        }
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveUsers(data.activeUsers || 0);
        setRoomExists(data.exists !== false); // fallback if not sent
      } catch (err) {
        console.error('Failed to fetch room data:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !text.trim()) return;
    await fetch(`/api/room/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), text: text.trim() }),
    });
    setText('');
  };

  const handleCloseChat = async () => {
    if (!confirm('Are you sure you want to close this chat? All messages will be permanently deleted.')) {
      return;
    }

    try {
      await fetch(`/api/room/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });

      // Optional: leave the room explicitly (not strictly needed since it's deleted)
      const connectionId = sessionStorage.getItem(`conn_${roomId}`);
      if (connectionId) {
        await fetch(`/api/room/${roomId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', connectionId }),
        });
      }

      alert('Chat closed successfully.');
      router.push('/'); // Redirect to home
    } catch (err) {
      console.error('Failed to close chat:', err);
      alert('Failed to close chat. Please try again.');
    }
  };

  if (!roomId) return <div>Loading...</div>;

  if (!roomExists) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Chat Closed</h2>
        <p>This chat room has been deleted.</p>
        <button
          onClick={() => router.push('/')}
          style={{ marginTop: '1rem', padding: '0.5rem', fontSize: '1rem' }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Room: {roomName}</h1>
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

      {/* 🔥 Close Chat Button */}
      <button
        onClick={handleCloseChat}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Close Chat
      </button>

      <button
        onClick={() => router.push('/')}
        style={{ marginTop: '1rem', padding: '0.5rem', fontSize: '1rem', marginLeft: '0.5rem' }}
      >
        ← Back to Home
      </button>
    </div>
  );
}
