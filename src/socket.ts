import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Project room events
    socket.on('join:project', (projectId: string) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // User room events for personal real-time notifications
    socket.on('join:user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('leave:user', (userId: string) => {
      if (userId) {
        socket.leave(`user:${userId}`);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToProject(projectId: string, event: string, data?: any) {
  if (io && projectId) {
    io.to(`project:${projectId}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data?: any) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
