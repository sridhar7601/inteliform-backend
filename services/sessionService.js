// sessionService.js - LangChain Session Management
const { v4: uuidv4 } = require('uuid');
const { BufferMemory } = require('langchain/memory');
const { ChatMessageHistory } = require('langchain/stores/message/in_memory');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');

/**
 * LangChain Session Class
 * Manages user sessions with conversation memory
 */
class LangChainSession {
  constructor(sessionId) {
    this.id = sessionId || uuidv4();
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.state = 'INIT';
    this.currentForm = null;
    this.currentField = 0;
    this.formData = {};
    this.verifiedFormStructure = null;
    this.generatedFiles = [];
    
    // LangChain Memory
    this.memory = new BufferMemory({
      chatHistory: new ChatMessageHistory(),
      returnMessages: true,
      memoryKey: "conversation_history"
    });
  }

  /**
   * Add a message to the conversation history
   * @param {string} type - 'user' or 'ai'
   * @param {string} content - Message content
   */
  async addMessage(type, content) {
    if (type === 'user') {
      await this.memory.chatHistory.addMessage(new HumanMessage(content));
    } else {
      await this.memory.chatHistory.addMessage(new AIMessage(content));
    }
    this.lastActivity = new Date();
  }

  /**
   * Get the conversation history as a formatted string
   * @returns {string} - Formatted conversation history
   */
  async getConversationHistory() {
    const messages = await this.memory.chatHistory.getMessages();
    return messages.slice(-6).map(msg => `${msg._getType()}: ${msg.content}`).join('\n');
  }
}

// Session store
const sessions = new Map();

/**
 * Get or create a session
 * @param {string} sessionId - Optional session ID
 * @returns {LangChainSession} - Session object
 */
function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    const session = new LangChainSession(sessionId);
    sessions.set(session.id, session);
    console.log(`📝 Created LangChain session: ${session.id}`);
    return session;
  }
  
  const session = sessions.get(sessionId);
  session.lastActivity = new Date();
  return session;
}

/**
 * Clean up expired sessions
 * Sessions older than maxAge will be removed
 * @param {number} maxAge - Maximum age in milliseconds
 */
function cleanupSessions(maxAge = 24 * 60 * 60 * 1000) {
  const now = new Date();
  let count = 0;
  
  for (const [id, session] of sessions.entries()) {
    const age = now - session.lastActivity;
    if (age > maxAge) {
      sessions.delete(id);
      count++;
    }
  }
  
  if (count > 0) {
    console.log(`🧹 Cleaned up ${count} expired sessions`);
  }
}

// Export session management functions
module.exports = {
  getSession,
  cleanupSessions,
  LangChainSession
};
