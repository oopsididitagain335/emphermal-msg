// lib/ephemeral-store.js
const rooms = new Map();
const roomConnections = new Map();

export function createRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      messages: [],
      createdAt: Date.now(),
    });
    roomConnections.set(roomId, new Set());
  }
  return rooms.get(roomId);
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function addMessage(roomId, message) {
  const room = getRoom(roomId);
  if (room) {
    room.messages.push(message);
    if (room.messages.length > 100) room.messages.shift();
    return true;
  }
  return false;
}

export function addConnection(roomId, connectionId) {
  createRoom(roomId);
  roomConnections.get(roomId).add(connectionId);
}

export function removeConnection(roomId, connectionId) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;

  connections.delete(connectionId);

  if (connections.size === 0) {
    rooms.delete(roomId);
    roomConnections.delete(roomId);
    console.log(`🗑️ Room ${roomId} DELETED - no active users`);
  }
}

export function getActiveUsers(roomId) {
  return roomConnections.get(roomId)?.size || 0;
}
