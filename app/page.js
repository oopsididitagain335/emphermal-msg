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
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>💬 Create a Private Chat Room</h1>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name (for URL)"
          style={{
            padding: '0.6rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minWidth: '200px',
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
        />
        <button
          onClick={handleCreateRoom}
          disabled={!roomName.trim()}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '1rem',
            backgroundColor: roomName.trim() ? '#0070f3' : '#eaeaea',
            color: roomName.trim() ? 'white' : '#999',
            border: 'none',
            borderRadius: '4px',
            cursor: roomName.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Create Room
        </button>
      </div>
    </div>
  );
}
