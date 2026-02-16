import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import http from 'http';
import { corsMiddleware } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { enforceHTTPS, securityHeaders } from './middleware/httpsEnforcement.js';
import apiRoutes from './routes/index.js';
import { initWebSocketServer } from './realtime/websocketServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// HTTPS Enforcement (production only)
app.use(enforceHTTPS);

// Security Headers
app.use(securityHeaders);

// Security
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ORBIT Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// SERVER START
// ============================================================================

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║        ORBIT Backend Server Started Successfully       ║
╠════════════════════════════════════════════════════════╣
║  Server URL: http://localhost:${PORT}                     ║
║  Environment: ${process.env.NODE_ENV || 'development'}                       ║
║  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}   ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

export default app;
