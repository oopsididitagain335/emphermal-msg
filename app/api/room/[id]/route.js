// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';

// In-memory ephemeral store
const rooms = new Map();           // active roomId → room data
const roomConnections = new Map(); // active roomId → Set<connectionId>

// ❌ DO NOT allow room creation via join — only via /api/room POST
// So remove createRoom() call from addConnection

function getRoom(roomId) {
  return rooms.get(roomId);
}

function addMessage(roomId, message) {
  const room = getRoom(roomId);
  if (!room) return false;
  room.messages.push(message);
  if (room.messages.length > 100) room.messages.shift();
  return true;
}

function addConnection(roomId, connectionId) {
  const room = getRoom(roomId);
  if (!room) return false; // 🔒 Do NOT create room here
  roomConnections.get(roomId).add(connectionId);
  return true;
}

function removeConnection(roomId, connectionId) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;

  connections.delete(connectionId);

  if (connections.size === 0) {
    // 🔥 PERMANENT DELETE — no trace left
    rooms.delete(roomId);
    roomConnections.delete(roomId);
  }
}

function getActiveUsers(roomId) {
  return roomConnections.get(roomId)?.size || 0;
}

// GET: Only return data if room exists
export async function GET(request, { params }) {
  const { id: roomId } = params;
  const room = getRoom(roomId);
  if (!room) {
    // Room is dead or never existed
    return NextResponse.json({ messages: [], activeUsers: 0 });
  }
  return NextResponse.json({
    messages: room.messages,
    activeUsers: getActiveUsers(roomId),
  });
}

// POST: Only accept if room exists
export async function POST(request, { params }) {
  const { id: roomId } = params;
  const { username, text } = await request.json();

  if (!username || !text) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found or expired' }, { status: 410 }); // 410 = Gone
  }

  const message = {
    id: Date.now().toString(),
    username: username.trim(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  addMessage(roomId, message);
  return NextResponse.json({ success: true });
}

// PUT: Only allow join/leave if room exists
export async function PUT(request, { params }) {
  const { id: roomId } = params;
  const { action, connectionId } = await request.json();

  if (action === 'join') {
    const success = addConnection(roomId, connectionId);
    if (!success) {
      return NextResponse.json({ error: 'Room not found' }, { status: 410 });
    }
  } else if (action === 'leave') {
    removeConnection(roomId, connectionId);
  }

  return NextResponse.json({ success: true });
}
