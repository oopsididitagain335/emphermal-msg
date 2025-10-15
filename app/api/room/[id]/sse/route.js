// app/api/room/[id]/sse/route.js
import { NextResponse } from 'next/server';
import client from '@/lib/mongodb';

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

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel limit

export async function GET(req, { params }) {
  const { id: roomId } = params;
  const coll = await getColl();

  // Join room
  await coll.updateOne(
    { _id: roomId },
    { $setOnInsert: { messages: [], createdAt: new Date() }, $inc: { activeConnections: 1 } },
    { upsert: true }
  );

  let room = await coll.findOne({ _id: roomId });
  const cleanup = async () => {
    const r = await coll.findOne({ _id: roomId });
    if (r && r.activeConnections > 0) {
      const newCount = r.activeConnections - 1;
      if (newCount <= 0) {
        await deleteRoom(roomId);
      } else {
        await coll.updateOne({ _id: roomId }, { $set: { activeConnections: newCount } });
      }
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial data
      if (room) {
        const { decryptTriple } = require('@/lib/crypto');
        const msgs = (room.messages || []).map(m => ({
          ...m,
          username: decryptTriple(m.username),
          text: decryptTriple(m.text)
        }));
        send({ type: 'init', messages: msgs, active: room.activeConnections });
      }

      // Poll for updates
      const poll = setInterval(async () => {
        room = await coll.findOne({ _id: roomId });
        if (!room) {
          send({ type: 'closed' });
          controller.close();
          clearInterval(poll);
          return;
        }
        const { decryptTriple } = require('@/lib/crypto');
        const msgs = (room.messages || []).map(m => ({
          ...m,
          username: decryptTriple(m.username),
          text: decryptTriple(m.text)
        }));
        send({ type: 'update', messages: msgs, active: room.activeConnections });
      }, 1200);

      const hb = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 20000);

      const close = () => {
        clearInterval(poll);
        clearInterval(hb);
        cleanup();
        controller.close();
      };

      if (req.socket) {
        req.socket.on('close', close);
        req.socket.on('error', close);
      }
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
