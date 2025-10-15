// app/room/[id]/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function ChatRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id;
  const usernameParam = searchParams.get('user');
  const username = usernameParam ? decodeURIComponent(usernameParam) : null;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const connectionIdRef = useRef(null);

  // Redirect if no username
  useEffect(() => {
    if (!username) window.location.href = '/';
  }, [username]);

  // Setup SSE connection
  useEffect(() => {
    if (!roomId || !username) return;
    
    // Generate unique connection ID
    connectionIdRef.current = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/room/${roomId}/events`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'init') {
        setMessages(data.messages || []);
        setActiveUsers(data.activeUsers || 0);
        setIsConnected(true);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
        setActiveUsers(data.activeUsers || 0);
      }
    };
    
    eventSource.onerror = () => {
      setIsConnected(false);
      // Auto-reconnect
      setTimeout(() => {
        if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
          eventSourceRef.current?.close();
          // Reconnect logic would go here
        }
      }, 3000);
    };
    
    // Notify server of connection
    fetch(`/api/room/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'join', 
        connectionId: connectionIdRef.current 
      })
    });
    
    return () => {
      // Cleanup on unmount
      eventSource.close();
      fetch(`/api/room/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'leave', 
          connectionId: connectionIdRef.current 
        })
      });
    };
  }, [roomId, username]);

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || !username) return;
    
    try {
      await fetch(`/api/room/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: newMessage.trim() })
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!username) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-2xl flex flex-col h-[90vh]">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Ephemeral Chat</h1>
          <p className="text-gray-600 text-sm">
            Chatting as <span className="font-semibold">{username}</span>
          </p>
          <div className="mt-2 flex justify-center items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-600">
              {isConnected ? `Connected • ${activeUsers} user${activeUsers !== 1 ? 's' : ''} online` : 'Connecting...'}
            </span>
          </div>
          <div className="mt-2 p-2 bg-green-100 text-green-800 text-xs rounded inline-block">
            💥 Messages vanish INSTANTLY when all users leave
          </div>
        </div>

        <div className="flex-1 bg-gray-50 rounded-xl p-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {isConnected ? 'No messages yet. Send a message to start!' : 'Connecting to room...'}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.username === username
                        ? 'bg-purple-100 rounded-br-none'
                        : 'bg-gray-200 rounded-bl-none'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">
                      {msg.username}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxLength={200}
            disabled={!isConnected}
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 whitespace-nowrap"
            disabled={!isConnected || !newMessage.trim()}
          >
            Send
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Create New Room
          </button>
        </div>
      </div>
    </div>
  );
}
