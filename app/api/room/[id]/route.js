// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';
import {
  getRoom,
  addMessage,
  addConnection,
  removeConnection,
  getActiveUsers,
} from '../../../lib/ephemeral-store.js'; // ← .js EXTENSION REQUIRED

export async function GET(request, { params }) {
  const { id: roomId } = params;
  const room = getRoom(roomId);
  return NextResponse.json({
    messages: room?.messages || [],
    activeUsers: room ? getActiveUsers(roomId) : 0,
  });
}

export async function POST(request, { params }) {
  const { id: roomId } = params;
  const { username, text } = await request.json();

  if (!username || !text) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const message = {
    id: Date.now().toString(),
    username: username.trim(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  const success = addMessage(roomId, message);
  return NextResponse.json({ success });
}

export async function PUT(request, { params }) {
  const { id: roomId } = params;
  const { action, connectionId } = await request.json();

  if (action === 'join') {
    addConnection(roomId, connectionId);
  } else if (action === 'leave') {
    removeConnection(roomId, connectionId);
  }

  return NextResponse.json({ success: true });
}
