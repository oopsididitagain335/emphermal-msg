// app/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const router = useRouter();

  const create = () => {
    const id = Math.random().toString(36).substring(2, 10);
    router.push(`/room/${encodeURIComponent(name || 'chat')}/${id}`);
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🔐 Ephemeral Chat</h1>
      <p>Messages auto-delete when room closes. No logs. No traces.</p>
      <div style={{ marginTop: '1rem' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Room name"
          onKeyPress={(e) => e.key === 'Enter' && create()}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <button onClick={create} disabled={!name.trim()}>
          Create Room
        </button>
      </div>
    </div>
  );
}
