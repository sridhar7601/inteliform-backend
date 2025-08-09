// server.js - IntelliForm AI Backend with LangChain
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import services
const { ensureDownloadsDir } = require('./services/pdfService');
const { cleanupSessions } = require('./services/sessionService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/api/downloads', express.static(path.join(__dirname, 'downloads')));

// Import and use routes
const chatRoutes = require('./routes/chat');
app.use('/api', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize server
async function startServer() {
  try {
    // Ensure downloads directory exists
    await ensureDownloadsDir();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 IntelliForm AI LangChain V4.0 running on port ${PORT}`);
      console.log(`🦜 LangChain: Fully Enabled with Bedrock Claude`);
      console.log(`✅ Verified Forms: ${Object.keys(require('./services/formsDatabase').VERIFIED_GOVERNMENT_FORMS).length}`);
      console.log(`🧠 Memory: Conversation Buffer Memory`);
      console.log(`🔗 Chains: Form Discovery + Field Validation`);
      console.log(`📄 PDF Generation: LangChain Verified`);
      console.log(`🎯 Ready for production LangChain workflows!`);
    });
    
    // Set up session cleanup interval (every 6 hours)
    setInterval(() => {
      cleanupSessions(6 * 60 * 60 * 1000);
    }, 6 * 60 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});
