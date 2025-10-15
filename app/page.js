// app/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');

  const handleCreateRoom = async () => {
    const name = roomName.trim();
    if (!name) return;

    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const { id } = await res.json();
      router.push(`/room/${encodeURIComponent(name)}/${id}`);
    }
  };

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
        <h1 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
          💬 Instant Private Chat
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Create a temporary room. Share the link. Chat in real time.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter a room name (e.g., Project Sync)"
            style={{
              padding: '0.875rem 1rem',
              fontSize: '1rem',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              outline: 'none',
              transition: 'border-color 0.2s',
              backgroundColor: '#f9fafb',
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
          />
          <button
            onClick={handleCreateRoom}
            disabled={!roomName.trim()}
            style={{
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: '600',
              backgroundColor: roomName.trim() ? '#3b82f6' : '#e5e7eb',
              color: roomName.trim() ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '10px',
              cursor: roomName.trim() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
          >
            🔐 Create & Join Room
          </button>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          Rooms are deleted when closed or after inactivity.
        </p>
      </div>
    </div>
  );
}
