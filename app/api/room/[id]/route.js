// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';
import client from '@/lib/mongodb';
import { encryptTriple, decryptTriple } from '@/lib/crypto';

const DB_NAME = 'chatapp';
const COLLECTION_NAME = 'rooms';

async function getCollection() {
  await client.connect();
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

async function deleteRoom(roomId) {
  const collection = await getCollection();
  await collection.deleteOne({ _id: roomId });
  console.log(`🗑️ Room ${roomId} permanently deleted from MongoDB`);
}

export async function GET(request, { params }) {
  const { id: roomId } = params;
  const collection = await getCollection();
  const room = await collection.findOne({ _id: roomId });

  if (!room || room.activeConnections <= 0) {
    return NextResponse.json({
      messages: [],
      activeUsers: 0,
      exists: false,
    });
  }

  // Decrypt messages for display (server-side decryption)
  const messages = (room.messages || []).map(msg => ({
    ...msg,
    username: decryptTriple(msg.username),
    text: decryptTriple(msg.text),
  }));

  return NextResponse.json({
    messages,
    activeUsers: room.activeConnections,
    exists: true,
  });
}

export async function POST(request, { params }) {
  const { id: roomId } = params;
  const { username, text } = await request.json();

  if (!username?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'Username and message required' }, { status: 400 });
  }

  const collection = await getCollection();
  const room = await collection.findOne({ _id: roomId });

  if (!room || room.activeConnections <= 0) {
    return NextResponse.json({ error: 'Room not active' }, { status: 404 });
  }

  const encryptedMsg = {
    id: Date.now().toString(),
    username: encryptTriple(username.trim()),
    text: encryptTriple(text.trim()),
    timestamp: new Date().toISOString(),
  };

  // Push and keep only last 100
  await collection.updateOne(
    { _id: roomId },
    {
      $push: {
        messages: {
          $each: [encryptedMsg],
          $slice: -100,
        },
      },
    }
  );

  return NextResponse.json({ success: true });
}

export async function PUT(request, { params }) {
  const { id: roomId } = params;
  const { action } = await request.json(); // connectionId not needed for counting

  const collection = await getCollection();

  if (action === 'join') {
    await collection.updateOne(
      { _id: roomId },
      {
        $setOnInsert: {
          createdAt: new Date(),
          messages: [],
        },
        $inc: { activeConnections: 1 },
      },
      { upsert: true }
    );
  } 
  else if (action === 'leave') {
    const room = await collection.findOne({ _id: roomId });
    if (!room) return NextResponse.json({ success: true });

    const newCount = Math.max(0, (room.activeConnections || 1) - 1);
    if (newCount === 0) {
      await deleteRoom(roomId);
    } else {
      await collection.updateOne(
        { _id: roomId },
        { $set: { activeConnections: newCount } }
      );
    }
  } 
  else if (action === 'close') {
    // Host explicitly closes room → delete immediately
    await deleteRoom(roomId);
  } 
  else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
