// controllers/agentController.js - Business logic ที่แยกจาก routes
const { Agent, agents } = require('../models/Agent');
const { AGENT_STATUS, VALID_STATUS_TRANSITIONS, API_MESSAGES } = require('../utils/constants');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const agentController = {
  // ✅ ตัวอย่างสำเร็จ
  getAgentById: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      console.log(`📋 Retrieved agent: ${agent.agentCode}`);
      return sendSuccess(res, 'Agent retrieved successfully', agent.toJSON());
    } catch (error) {
      console.error('Error in getAgentById:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #1: GET /api/agents
  getAllAgents: (req, res) => {
    try {
      // ✅ ดึงข้อมูล agents ทั้งหมดจาก Map
      let agentList = Array.from(agents.values());

      // ✅ Filter ตาม query parameters
      const { status, department } = req.query;
      if (status) {
        agentList = agentList.filter(agent => agent.status === status);
      }
      if (department) {
        agentList = agentList.filter(agent => agent.department === department);
      }

      // ✅ ส่ง response
      return sendSuccess(res, 'Agents retrieved successfully', agentList.map(a => a.toJSON()));
    } catch (error) {
      console.error('Error in getAllAgents:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #2: POST /api/agents
  createAgent: (req, res) => {
    try {
      const agentData = req.body;

      // ✅ ตรวจสอบว่า agentCode ซ้ำไหม
      const exists = Array.from(agents.values()).find(a => a.agentCode === agentData.agentCode);
      if (exists) {
        return sendError(res, API_MESSAGES.AGENT_ALREADY_EXISTS, 400);
      }

      // ✅ สร้าง Agent ใหม่
      const newAgent = new Agent(agentData);

      // ✅ เก็บลง Map
      agents.set(newAgent.id, newAgent);

      console.log(`🆕 Created agent: ${newAgent.agentCode}`);
      // ✅ ส่ง response พร้อม status 201
      return sendSuccess(res, API_MESSAGES.AGENT_CREATED, newAgent.toJSON(), 201);
    } catch (error) {
      console.error('Error in createAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ ตัวอย่างสำเร็จ
  updateAgent: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      const { name, email, department, skills } = req.body;
      
      if (name) agent.name = name;
      if (email) agent.email = email;
      if (department) agent.department = department;
      if (skills) agent.skills = skills;
      
      agent.updatedAt = new Date();
      
      console.log(`✏️ Updated agent: ${agent.agentCode}`);
      return sendSuccess(res, API_MESSAGES.AGENT_UPDATED, agent.toJSON());
    } catch (error) {
      console.error('Error in updateAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // 🔄 TODO #3: PATCH /api/agents/:id/status
  updateAgentStatus: (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // ✅ หา agent จาก id
      const agent = agents.get(id);
      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      // ✅ validate status ด้วย AGENT_STATUS
      if (!Object.values(AGENT_STATUS).includes(status)) {
        return sendError(res, `Invalid status: ${status}`, 400);
      }

      // ✅ ตรวจสอบ valid transition
      const currentStatus = agent.status;
      const validNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
      if (!validNextStatuses.includes(status)) {
        return sendError(
          res,
          `Cannot change from ${currentStatus} to ${status}. Valid transitions: ${validNextStatuses.join(', ')}`,
          400
        );
      }

      // ✅ อัปเดตสถานะ
      agent.updateStatus(status, reason);

      console.log(`🔄 Status updated: ${agent.agentCode} → ${status}`);
      return sendSuccess(
        res,
        `Agent status updated to ${status}`,
        { id: agent.id, agentCode: agent.agentCode, status: agent.status, lastStatusChange: agent.lastStatusChange }
      );

    } catch (error) {
      console.error('Error in updateAgentStatus:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ ตัวอย่างสำเร็จ
  deleteAgent: (req, res) => {
    try {
      const { id } = req.params;
      const agent = agents.get(id);

      if (!agent) {
        return sendError(res, API_MESSAGES.AGENT_NOT_FOUND, 404);
      }

      agents.delete(id);
      
      console.log(`🗑️ Deleted agent: ${agent.agentCode} - ${agent.name}`);
      return sendSuccess(res, API_MESSAGES.AGENT_DELETED);
    } catch (error) {
      console.error('Error in deleteAgent:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  },

  // ✅ Dashboard API
  getStatusSummary: (req, res) => {
    try {
      const agentList = Array.from(agents.values());
      const totalAgents = agentList.length;
      
      const statusCounts = {};
      Object.values(AGENT_STATUS).forEach(status => {
        statusCounts[status] = agentList.filter(agent => agent.status === status).length;
      });

      const statusPercentages = {};
      Object.entries(statusCounts).forEach(([status, count]) => {
        statusPercentages[status] = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
      });

      const summary = {
        totalAgents,
        statusCounts,
        statusPercentages,
        lastUpdated: new Date().toISOString()
      };

      return sendSuccess(res, 'Status summary retrieved successfully', summary);
    } catch (error) {
      console.error('Error in getStatusSummary:', error);
      return sendError(res, API_MESSAGES.INTERNAL_ERROR, 500);
    }
  }
};

module.exports = agentController;
