# Agent Wallboard API - Enhanced Phase 2

> Professional Node.js API สำหรับจัดการ Call Center Agents แบบ Real-time  
> Phase 2: เปลี่ยนจาก in-memory Map → MongoDB + เพิ่ม WebSocket สำหรับ real-time updates

## ✨ Features Enhanced
- 🏗️ Professional MVC project structure
- ✅ Input validation with Joi
- 🛡️ Security middleware: Helmet
- 📝 Request logging และ performance monitoring
- ⚠️ Global error handling
- 📊 Consistent API response format
- 🗄️ **Persistent storage** ด้วย MongoDB แทน in-memory Map
- 🌐 **Real-time updates** ด้วย WebSocket (Socket.IO)
- 🔄 Agent status updates, dashboard stats อัปเดตทันทีแบบเรียลไทม์

## 📦 Installation & Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/agent-wallboard-api-phase2.git
cd agent-wallboard-api-phase2

# 2. Install dependencies
npm install

# 3. สร้าง environment file
cp .env.example .env
# แก้ไขค่าต่างๆ เช่น MONGO_URI, PORT ตามต้องการ

# 4. Start development server
npm run dev
