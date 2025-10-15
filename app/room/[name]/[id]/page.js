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
  const [roomExists, setRoomExists] = useState(true);

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
        setRoomExists(data.exists !== false);
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

      const connectionId = sessionStorage.getItem(`conn_${roomId}`);
      if (connectionId) {
        await fetch(`/api/room/${roomId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', connectionId }),
        });
      }

      alert('Chat closed successfully.');
      router.push('/');
    } catch (err) {
      console.error('Failed to close chat:', err);
      alert('Failed to close chat. Please try again.');
    }
  };

  if (!roomId) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (!roomExists) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
            🚫 Chat Closed
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            This room has been deleted by the host.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '1rem',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
            💬 {roomName}
          </h1>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            👥 {activeUsers} {activeUsers === 1 ? 'user' : 'users'}
          </div>
        </div>

        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: '#f8fafc',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>
              <p>No messages yet. Be the first to say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  maxWidth: '80%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  backgroundColor: '#e0f2fe',
                  alignSelf: 'flex-start',
                }}
              >
                <div style={{ fontWeight: '600', color: '#0c4a6e', fontSize: '0.95rem' }}>
                  {msg.username}
                </div>
                <div style={{ marginTop: '0.25rem', wordBreak: 'break-word' }}>{msg.text}</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            backgroundColor: 'white',
          }}
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            style={{
              flex: '0 0 120px',
              padding: '0.625rem 1rem',
              fontSize: '0.95rem',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              outline: 'none',
            }}
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '0.625rem 1rem',
              fontSize: '0.95rem',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!username.trim() || !text.trim()}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: '600',
              backgroundColor: username.trim() && text.trim() ? '#3b82f6' : '#e2e8f0',
              color: username.trim() && text.trim() ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '10px',
              cursor: username.trim() && text.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </form>

        {/* Footer Actions */}
        <div
          style={{
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: 'white',
          }}
        >
          <button
            onClick={handleCloseChat}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#ef4444',
              backgroundColor: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🔒 Close Chat
          </button>

          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← Leave
          </button>
        </div>
      </div>
    </div>
  );
}
