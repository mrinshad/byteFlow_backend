import 'dotenv/config';
import http from 'http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './prisma.js';
import { initSocket } from './socket.js';
import { authenticate } from './middleware/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import laneRoutes from './routes/lane.routes.js';
import cardRoutes from './routes/card.routes.js';
import commentRoutes from './routes/comment.routes.js';
import tagRoutes from './routes/tag.routes.js';
import activityRoutes from './routes/activity.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initSocket(httpServer);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Health Check (public)
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Auth Routes (public - register, login; protected - me)
app.use('/api/auth', authRoutes);

// Protected Routes - require authentication
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/lanes', authenticate, laneRoutes);
app.use('/api/cards', authenticate, cardRoutes);
app.use('/api/comments', authenticate, commentRoutes);
app.use('/api/tags', authenticate, tagRoutes);
app.use('/api/activities', authenticate, activityRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[Error] ${statusCode} - ${message}`, err.stack || err);
  res.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO running on http://localhost:${PORT}`);
});
