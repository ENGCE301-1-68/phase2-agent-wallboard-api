// websocket/socketServer.js - WebSocket server management
const socketIo = require('socket.io');
const AgentMongo = require('../models/AgentMongo');

class SocketServer {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // Map: socketId -> clientInfo
  }

  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [
          'http://localhost:3000', // สำหรับ front-end
          'http://127.0.0.1:5500', // สำหรับ Live Server VS Code
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    console.log('🌐 WebSocket server initialized');
    return this.io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 Client connected: ${socket.id}`);

      // Agent login
      socket.on('agent-login', async (data) => {
        try {
          const { agentCode, agentName } = data;
          console.log(`🔐 Agent login: ${agentCode}`);

          const agent = await AgentMongo.findOneAndUpdate(
            { agentCode },
            {
              isOnline: true,
              socketId: socket.id,
              loginTime: new Date()
            },
            { new: true }
          );

          if (agent) {
            this.connectedClients.set(socket.id, {
              agentCode,
              agentName,
              agentId: agent._id,
              loginTime: new Date()
            });

            socket.join(`agent-${agentCode}`);

            socket.broadcast.emit('agent-online', {
              agentCode,
              agentName,
              timestamp: new Date()
            });

            socket.emit('login-success', {
              agent: agent,
              message: 'Successfully connected to Agent Wallboard System'
            });

            console.log(`✅ Agent ${agentCode} logged in successfully`);
          } else {
            socket.emit('login-error', {
              message: `Agent ${agentCode} not found`
            });
          }
        } catch (error) {
          console.error('❌ Agent login error:', error);
          socket.emit('login-error', { message: 'Login failed' });
        }
      });

      // Agent logout
      socket.on('agent-logout', async () => {
        try {
          if (this.connectedClients.has(socket.id)) {
            await this.handleAgentDisconnect(socket.id);
          }
        } catch (error) {
          console.error('❌ Agent logout error:', error);
        }
      });

      // Join dashboard room
      socket.on('join-dashboard', () => {
        socket.join('dashboard');
        console.log(`📊 Client joined dashboard room: ${socket.id}`);
        this.sendDashboardUpdate();
      });

      // Disconnect
      socket.on('disconnect', async () => {
        console.log(`👤 Client disconnected: ${socket.id}`);
        await this.handleAgentDisconnect(socket.id);
      });

      // Ping-pong
      socket.on('ping', () => socket.emit('pong'));
    });
  }

  async handleAgentDisconnect(socketId) {
    try {
      const clientInfo = this.connectedClients.get(socketId);
      if (!clientInfo) return;

      const { agentCode, agentName } = clientInfo;

      await AgentMongo.findOneAndUpdate(
        { agentCode },
        { isOnline: false, socketId: null, status: 'Offline' }
      );

      this.connectedClients.delete(socketId);

      this.io.emit('agent-offline', {
        agentCode,
        agentName,
        timestamp: new Date()
      });

      console.log(`🔌 Agent ${agentCode} disconnected and marked offline`);
    } catch (error) {
      console.error('❌ Error handling agent disconnect:', error);
    }
  }

  async sendDashboardUpdate() {
    try {
      const totalAgents = await AgentMongo.countDocuments({ isActive: true });
      const onlineAgents = await AgentMongo.countDocuments({ isActive: true, isOnline: true });

      const statusCounts = await AgentMongo.aggregate([
        { $match: { isActive: true, isOnline: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const stats = {
        totalAgents,
        onlineAgents,
        offlineAgents: totalAgents - onlineAgents,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        timestamp: new Date()
      };

      this.io.to('dashboard').emit('dashboardUpdate', stats);
    } catch (error) {
      console.error('❌ Error sending dashboard update:', error);
    }
  }

  sendToAgent(agentCode, event, data) {
    this.io.to(`agent-${agentCode}`).emit(event, data);
  }

  broadcastToAllAgents(event, data) {
    this.io.emit(event, data);
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  getIO() {
    return this.io;
  }
}

module.exports = new SocketServer();
