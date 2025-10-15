// app/api/room/[id]/sse/route.js
import { NextResponse } from 'next/server';
import client from '@/lib/mongodb';
import { decryptTriple } from '@/lib/crypto'; // Optional: remove if not decrypting

const DB_NAME = 'chatapp';
const COLLECTION_NAME = 'rooms';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel: max 5 minutes per request

async function getCollection() {
  await client.connect();
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

async function deleteRoom(roomId) {
  const collection = await getCollection();
  await collection.deleteOne({ _id: roomId });
  console.log(`🗑️ Room ${roomId} deleted from DB`);
}

export async function GET(request, { params }) {
  const { id: roomId } = params;

  // Generate a unique connection ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const collection = await getCollection();

  // Join room: increment activeConnections
  const result = await collection.updateOne(
    { _id: roomId },
    {
      $setOnInsert: { createdAt: new Date(), messages: [] },
      $inc: { activeConnections: 1 }
    },
    { upsert: true, returnDocument: 'after' }
  );

  // If room didn't exist and was just created, it's fine — we'll stream empty data
  const room = await collection.findOne({ _id: roomId });

  // Cleanup function: decrement connection count or delete room
  async function cleanup() {
    try {
      const currentRoom = await collection.findOne({ _id: roomId });
      if (!currentRoom) return;

      const newCount = Math.max(0, (currentRoom.activeConnections || 1) - 1);
      if (newCount === 0) {
        await deleteRoom(roomId);
      } else {
        await collection.updateOne(
          { _id: roomId },
          { $set: { activeConnections: newCount } }
        );
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }

  // Set up SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial data
      if (room) {
        // Optional: decrypt messages before sending
        const messages = (room.messages || []).map(msg => ({
          ...msg,
          username: decryptTriple ? decryptTriple(msg.username) : msg.username,
          text: decryptTriple ? decryptTriple(msg.text) : msg.text,
        }));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'init',
          messages,
          activeUsers: room.activeConnections || 1
        })}\n\n`));
      } else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'init',
          messages: [],
          activeUsers: 1
        })}\n\n`));
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 20000);

      // Poll for updates (every 1-2 sec)
      const pollInterval = setInterval(async () => {
        try {
          const updatedRoom = await collection.findOne({ _id: roomId });
          if (!updatedRoom) {
            // Room was deleted → close stream
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'room_closed' })}\n\n`));
            cleanup();
            clearInterval(heartbeat);
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          const messages = (updatedRoom.messages || []).map(msg => ({
            ...msg,
            username: decryptTriple ? decryptTriple(msg.username) : msg.username,
            text: decryptTriple ? decryptTriple(msg.text) : msg.text,
          }));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'update',
            messages,
            activeUsers: updatedRoom.activeConnections
          })}\n\n`));
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 1500);

      // Handle client disconnect
      const cleanupHandler = async () => {
        clearInterval(heartbeat);
        clearInterval(pollInterval);
        await cleanup();
        controller.close();
      };

      // Vercel/Node.js socket handling
      if (request.socket) {
        request.socket.on('close', cleanupHandler);
        request.socket.on('error', cleanupHandler);
      }
    },

    async cancel() {
      await cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  });
}
