import io from 'socket.io-client';

let socket = null;

export default function (context, inject) {
  if (process.client) {
    const baseURL = 'http://localhost:3030';
    
    console.log('🔌 Initializing socket connection...');
    
    socket = io(baseURL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully, ID:', socket.id);
      
      // Auto-authenticate if token exists
      const token = localStorage.getItem('authToken');
      if (token) {
        console.log('🔑 Auto-authenticating with stored token...');
        socket.emit('authenticate', { token });
      }
    });

    socket.on('authenticated', (data) => {
      console.log('🎉 Socket authentication:', data.success ? 'SUCCESS' : 'FAILED');
      if (data.success) {
        console.log('✅ User ID:', data.userId);
      } else {
        console.error('❌ Authentication failed:', data.error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });

    // Helper method for manual authentication
    socket.authenticate = (token) => {
      console.log('🔑 Manual authentication triggered');
      socket.emit('authenticate', { token });
    };
  }

  inject('socket', socket);
}



