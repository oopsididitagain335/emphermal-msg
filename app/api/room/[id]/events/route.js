import { NextRequest } from 'next/server';
import { 
  getRoom, 
  addConnection, 
  removeConnection,
  getActiveUsers 
} from '../../../../lib/ephemeral-store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id: roomId } = params;
  
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  addConnection(roomId, connectionId);
  
  const cleanup = () => {
    removeConnection(roomId, connectionId);
  };
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const room = getRoom(roomId);
      if (room) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'init', 
          messages: room.messages,
          activeUsers: getActiveUsers(roomId)
        })}\n\n`));
      }
      
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 20000);
      
      const cleanupHandler = () => {
        clearInterval(heartbeat);
        cleanup();
        controller.close();
      };
      
      if (request.socket) {
        request.socket.on('close', cleanupHandler);
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
