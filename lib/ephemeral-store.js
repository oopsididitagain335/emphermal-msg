// lib/ephemeral-store.js
const rooms = new Map();

// Track active connections per room
const roomConnections = new Map(); // roomId => Set of connection IDs

export function createRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      messages: [],
      createdAt: Date.now()
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

// Add a connection to a room
export function addConnection(roomId, connectionId) {
  createRoom(roomId);
  roomConnections.get(roomId).add(connectionId);
}

// Remove a connection and cleanup if last user leaves
export function removeConnection(roomId, connectionId) {
  const connections = roomConnections.get(roomId);
  if (!connections) return;
  
  connections.delete(connectionId);
  
  // If no more connections, delete the room immediately
  if (connections.size === 0) {
    rooms.delete(roomId);
    roomConnections.delete(roomId);
    console.log(`🗑️ Room ${roomId} DELETED - no active users`);
  }
}

// Get number of active users in room
export function getActiveUsers(roomId) {
  return roomConnections.get(roomId)?.size || 0;
}
