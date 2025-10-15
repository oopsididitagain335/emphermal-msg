// app/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');

  const handleCreateRoom = () => {
    if (!roomName.trim()) return;
    // Redirect to the new room
    router.push(`/room/${encodeURIComponent(roomName.trim())}`);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Create a Chat Room</h1>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          style={{ padding: '0.5rem', fontSize: '1rem' }}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
        />
        <button
          onClick={handleCreateRoom}
          disabled={!roomName.trim()}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            backgroundColor: roomName.trim() ? '#0070f3' : '#ccc',
            color: 'white',
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
