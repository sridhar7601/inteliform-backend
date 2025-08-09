// chat.js - Chat API Routes
const express = require('express');
const path = require('path');
const router = express.Router();

// Import services
const { processUserMessage } = require('../services/aiService');
const { getSession } = require('../services/sessionService');
const { generateVerifiedPDF } = require('../services/pdfService');

/**
 * POST /api/chat
 * Process user messages with LangChain
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const session = getSession(sessionId);
    
    console.log(`📨 LangChain Session ${session.id}: "${message}"`);
    
    const result = await processUserMessage(message, session);
    
    res.json({
      success: true,
      sessionId: session.id,
      response: result,
      sessionState: {
        state: session.state,
        currentForm: session.currentForm,
        progress: session.verifiedFormStructure ? 
          `${session.currentField}/${session.verifiedFormStructure.verified_fields.length}` : null,
        formName: session.verifiedFormStructure?.name,
        verified: !!session.verifiedFormStructure,
        langchain: true
      }
    });
    
  } catch (error) {
    console.error('❌ LangChain Chat Error:', error);
    res.status(500).json({
      success: false,
      error: 'LangChain processing failed',
      message: error.message
    });
  }
});

/**
 * POST /api/generate-pdf
 * Generate a verified PDF from form data
 */
router.post('/generate-pdf', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    
    if (!session || session.state !== 'COMPLETE') {
      return res.status(400).json({ error: 'Session not ready for PDF generation' });
    }
    
    const filename = `${session.currentForm}_langchain_${Date.now()}.pdf`;
    const outputPath = path.join(__dirname, '..', 'downloads', filename);
    
    await generateVerifiedPDF(session.formData, session.verifiedFormStructure, outputPath);
    
    res.json({
      success: true,
      filename: filename,
      downloadUrl: `/api/download/${filename}`,
      formName: session.verifiedFormStructure.name,
      verified: true,
      langchain: true
    });
    
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

/**
 * GET /api/download/:filename
 * Download a generated PDF file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'downloads', req.params.filename);
    await require('fs').promises.access(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'LangChain V4.0',
    features: ['langchain_chains', 'verified_forms', 'bedrock_claude', 'conversation_memory'],
    verified_forms: Object.keys(require('../services/formsDatabase').VERIFIED_GOVERNMENT_FORMS),
    sessions: require('../services/sessionService').sessions?.size || 0,
    langchain: '✅ Enabled'
  });
});

module.exports = router;
