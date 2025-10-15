// app/api/room/[id]/events/route.js
import { NextRequest } from 'next/server';
import { getRoom, addConnection, removeConnection } from '@/lib/ephemeral-store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id: roomId } = params;
  
  // Create a unique connection ID
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add connection
  addConnection(roomId, connectionId);
  
  // Cleanup function
  const cleanup = () => {
    removeConnection(roomId, connectionId);
  };
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial data
      const room = getRoom(roomId);
      if (room) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'init', 
          messages: room.messages,
          activeUsers: require('@/lib/ephemeral-store').getActiveUsers(roomId)
        })}\n\n`));
      }
      
      // Keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 20000);
      
      // Handle client disconnect
      const cleanupHandler = () => {
        clearInterval(heartbeat);
        cleanup();
        controller.close();
      };
      
      // @ts-ignore
      if (request.socket) {
        // @ts-ignore
        request.socket.on('close', cleanupHandler);
        // @ts-ignore
        request.socket.on('error', cleanupHandler);
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
