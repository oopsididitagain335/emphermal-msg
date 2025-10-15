// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';
import client from '@/lib/mongodb';
import { encryptTriple } from '@/lib/crypto';

const DB_NAME = 'chatapp';
const COLLECTION_NAME = 'rooms';

async function getCollection() {
  await client.connect();
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

// Helper: delete room immediately
async function deleteRoom(roomId) {
  const collection = await getCollection();
  await collection.deleteOne({ _id: roomId });
}

export async function GET(request, { params }) {
  const { id: roomId } = params;
  const collection = await getCollection();
  const room = await collection.findOne({ _id: roomId });

  if (!room) {
    return NextResponse.json({
      messages: [],
      activeUsers: 0,
      exists: false,
    });
  }

  // We don't decrypt here — frontend doesn't need to see messages via GET
  // (Messages are only shown via real-time polling of encrypted data,
  // but decryption happens on frontend if you send key — which we DON'T)
  // 👉 Actually: we won't send messages via GET at all for security.
  // Instead, we only send active user count. Messages are handled via POST + client-side echo.

  return NextResponse.json({
    activeUsers: room.activeConnections || 0,
    exists: true,
  });
}

export async function POST(request, { params }) {
  const { id: roomId } = params;
  const { username, text } = await request.json();

  if (!username || !text) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const collection = await getCollection();
  const room = await collection.findOne({ _id: roomId });
  if (!room) {
    return NextResponse.json({ error: 'Room not active' }, { status: 404 });
  }

  // ✅ Encrypt message 3x
  const encryptedText = encryptTriple(text.trim());
  const encryptedUsername = encryptTriple(username.trim());

  const message = {
    id: Date.now().toString(),
    username: encryptedUsername,
    text: encryptedText,
    timestamp: new Date().toISOString(),
  };

  // Push to DB (only while room exists)
  await collection.updateOne(
    { _id: roomId },
    { $push: { messages: { $each: [message], $slice: -100 } } }
  );

  return NextResponse.json({ success: true });
}

export async function PUT(request, { params }) {
  const { id: roomId } = params;
  const { action, connectionId } = await request.json();

  const collection = await getCollection();

  if (action === 'join') {
    await collection.updateOne(
      { _id: roomId },
      {
        $setOnInsert: { createdAt: new Date(), activeConnections: 0, messages: [] },
        $inc: { activeConnections: 1 }
      },
      { upsert: true }
    );
  } 
  else if (action === 'leave') {
    const room = await collection.findOne({ _id: roomId });
    if (!room) return NextResponse.json({ success: true });

    const newCount = Math.max(0, (room.activeConnections || 1) - 1);
    if (newCount === 0) {
      // 🔥 LAST USER LEFT → DELETE ENTIRE ROOM
      await deleteRoom(roomId);
    } else {
      await collection.updateOne(
        { _id: roomId },
        { $set: { activeConnections: newCount } }
      );
    }
  } 
  else if (action === 'close') {
    // 🔥 Explicit close → delete immediately
    await deleteRoom(roomId);
  }

  return NextResponse.json({ success: true });
}
