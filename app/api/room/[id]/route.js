// app/api/room/[id]/route.js
import { NextResponse } from 'next/server';
import client from '@/lib/mongodb';
import { encryptTriple } from '@/lib/crypto';

const DB = 'chatapp';
const COLL = 'rooms';

async function getColl() {
  await client.connect();
  return client.db(DB).collection(COLL);
}

async function deleteRoom(id) {
  const coll = await getColl();
  await coll.deleteOne({ _id: id });
}

export async function POST(req, { params }) {
  const { id: roomId } = params;
  const { username, text } = await req.json();
  if (!username?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const coll = await getColl();
  const room = await coll.findOne({ _id: roomId });
  if (!room || room.activeConnections <= 0) {
    return NextResponse.json({ error: 'Room closed' }, { status: 404 });
  }

  const msg = {
    id: Date.now().toString(),
    username: encryptTriple(username.trim()),
    text: encryptTriple(text.trim()),
    timestamp: new Date().toISOString()
  };

  await coll.updateOne(
    { _id: roomId },
    { $push: { messages: { $each: [msg], $slice: -100 } } }
  );

  return NextResponse.json({ ok: true });
}

export async function PUT(req, { params }) {
  const { id: roomId } = params;
  const { action } = await req.json();
  const coll = await getColl();

  if (action === 'close') {
    await deleteRoom(roomId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
