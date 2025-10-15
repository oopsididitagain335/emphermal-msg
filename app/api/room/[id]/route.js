// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';

const rooms = new Map();
const roomConnections = new Map();

function createRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { messages: [], createdAt: Date.now() });
    roomConnections.set(roomId, new Set());
  }
}

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
  createRoom(roomId);
  roomConnections.get(roomId).add(connectionId);
}

function removeConnection(roomId, connectionId) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;
  connections.delete(connectionId);
  if (connections.size === 0) {
    rooms.delete(roomId);
    roomConnections.delete(roomId);
    // ✅ Messages and connections fully purged
  }
}

function getActiveUsers(roomId) {
  return roomConnections.get(roomId)?.size || 0;
}

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
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not active' }, { status: 404 });
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
