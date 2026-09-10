import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { createIncidentsRouter } from './routes/incidents.js';
import { createCheckInRouter } from './routes/checkin.js';
import { createReportsRouter } from './routes/reports.js';
import { sharePointSync } from './services/sharePointSync.js';
import { store } from './store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Attach routes
app.use('/api/incidents', createIncidentsRouter(io));
app.use('/api/checkin', createCheckInRouter(io));
app.use('/api/reports', createReportsRouter());

// Serve static frontend build if dist folder exists
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SharePoint sync status endpoint
app.get('/api/sharepoint/status', (req, res) => {
  res.json(sharePointSync.getStatus());
});

// Health check
app.get('/api/health', (req, res) => {
  const active = store.getActiveIncident();
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    activeEmergency: !!active,
    incidentId: active ? active.id : null
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('initial_state', store.getRosterSummary());

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚨 Emergency Muster & Roll Call Server Active`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket Hub Ready`);
  console.log(`====================================================`);
});
