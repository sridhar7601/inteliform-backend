const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files (for downloads)
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Create downloads directory if it doesn't exist
const ensureDownloadsDir = async () => {
  const downloadsDir = path.join(__dirname, 'downloads');
  try {
    await fs.access(downloadsDir);
  } catch {
    await fs.mkdir(downloadsDir, { recursive: true });
    console.log('📁 Created downloads directory');
  }
};

// Initialize AWS Bedrock Client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

// In-Memory Session Store
const sessions = new Map();

// Enhanced Government Forms Database with PDF Templates
const governmentForms = {
  "pan_card": {
    name: "Permanent Account Number (PAN)",
    authority: "Income Tax Department",
    form_number: "Form 49A",
    keywords: ["pan", "permanent", "account", "number", "income", "tax"],
    fields: [
      { name: "title", question: "What is your title?", type: "choice", options: ["Mr.", "Mrs.", "Ms.", "Dr."] },
      { name: "full_name", question: "What is your full name?", type: "text", required: true },
      { name: "father_name", question: "What is your father's full name?", type: "text", required: true },
      { name: "dob", question: "What is your date of birth? (DD/MM/YYYY)", type: "date", required: true },
      { name: "gender", question: "What is your gender?", type: "choice", options: ["Male", "Female", "Other"] },
      { name: "address", question: "What is your complete postal address?", type: "textarea", required: true },
      { name: "mobile", question: "What is your mobile number?", type: "phone", required: true },
      { name: "email", question: "What is your email address?", type: "email", required: true }
    ],
    documents: ["Identity Proof", "Address Proof", "Date of Birth Proof"],
    fee: "₹110 (Indian address), ₹1020 (Foreign address)",
    processing_time: "15-20 working days",
    eligibility: "Any Indian citizen or entity requiring PAN for tax purposes",
    template: "pan_card_template"
  },
  "driving_license": {
    name: "Driving License",
    authority: "Regional Transport Office (RTO)",
    form_number: "Form 2 (Learner's), Form 4 (Permanent)",
    keywords: ["driving", "license", "licence", "dl", "vehicle", "car", "bike", "motorcycle"],
    fields: [
      { name: "license_type", question: "Are you applying for a new license or renewal?", type: "choice", options: ["New License", "Renewal", "Duplicate"] },
      { name: "vehicle_class", question: "What type of vehicle do you want to drive?", type: "choice", options: ["Car (LMV)", "Motorcycle", "Both Car & Motorcycle", "Commercial Vehicle"] },
      { name: "full_name", question: "What is your full name as per official documents?", type: "text", required: true },
      { name: "father_name", question: "What is your father's name?", type: "text", required: true },
      { name: "dob", question: "What is your date of birth? (DD/MM/YYYY)", type: "date", required: true },
      { name: "address", question: "What is your complete address?", type: "textarea", required: true },
      { name: "mobile", question: "What is your mobile number?", type: "phone", required: true },
      { name: "blood_group", question: "What is your blood group?", type: "choice", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }
    ],
    documents: ["Age Proof", "Address Proof", "Passport Size Photos", "Medical Certificate"],
    fee: "₹200 (Learner's), ₹500 (Permanent)",
    processing_time: "7-15 days",
    eligibility: "18+ years for car, 16+ for motorcycle",
    template: "driving_license_template"
  },
  "passport": {
    name: "Indian Passport",
    authority: "Ministry of External Affairs",
    form_number: "Online Application",
    keywords: ["passport", "travel", "visa", "international"],
    fields: [
      { name: "passport_type", question: "What type of passport do you need?", type: "choice", options: ["Fresh Passport", "Re-issue", "Renewal"] },
      { name: "booklet_type", question: "How many pages do you need?", type: "choice", options: ["36 pages", "60 pages"] },
      { name: "full_name", question: "What is your full name?", type: "text", required: true },
      { name: "father_name", question: "What is your father's name?", type: "text", required: true },
      { name: "mother_name", question: "What is your mother's name?", type: "text", required: true },
      { name: "dob", question: "What is your date of birth? (DD/MM/YYYY)", type: "date", required: true },
      { name: "place_of_birth", question: "What is your place of birth (city)?", type: "text", required: true },
      { name: "address", question: "What is your current address?", type: "textarea", required: true }
    ],
    documents: ["Birth Certificate", "Address Proof", "Identity Proof"],
    fee: "₹1500 (36 pages), ₹2000 (60 pages)",
    processing_time: "30-45 days",
    eligibility: "Indian citizen",
    template: "passport_template"
  }
};

// PDF Template Generators
const generatePANCardPDF = (formData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // Header - Government of India
      doc.fontSize(20).font('Helvetica-Bold')
         .text('GOVERNMENT OF INDIA', { align: 'center' });
      
      doc.fontSize(16).font('Helvetica-Bold')
         .text('INCOME TAX DEPARTMENT', { align: 'center' });
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('APPLICATION FOR ALLOTMENT OF PERMANENT ACCOUNT NUMBER (PAN)', { align: 'center' });
      
      doc.fontSize(12).font('Helvetica')
         .text('Form No. 49A', { align: 'center' })
         .moveDown(2);

      // Form fields
      const fields = [
        ['Title', formData.title || ''],
        ['Full Name', formData.full_name || ''],
        ['Father\'s Name', formData.father_name || ''],
        ['Date of Birth', formData.dob || ''],
        ['Gender', formData.gender || ''],
        ['Mobile Number', formData.mobile || ''],
        ['Email Address', formData.email || ''],
        ['Address', formData.address || '']
      ];

      let yPosition = doc.y;
      
      fields.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`${label}:`, 50, yPosition, { width: 150 });
        
        doc.fontSize(12).font('Helvetica')
           .text(value, 200, yPosition, { width: 300 });
           
        yPosition += 30;
        
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Footer
      doc.moveDown(3)
         .fontSize(10).font('Helvetica')
         .text('Required Documents:', { underline: true })
         .text('• Identity Proof (Aadhaar Card, Voter ID, etc.)')
         .text('• Address Proof (Utility Bill, Bank Statement, etc.)')
         .text('• Date of Birth Proof (Birth Certificate, Passport, etc.)')
         .moveDown()
         .text('Processing Fee: ₹110 (Indian address), ₹1020 (Foreign address)')
         .text('Processing Time: 15-20 working days')
         .moveDown(2)
         .text('Applicant Signature: _________________________', { align: 'right' })
         .text('Date: _________________________', { align: 'right' })
         .moveDown()
         .fontSize(8)
         .text(`Generated by IntelliForm AI on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

const generateDrivingLicensePDF = (formData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('REGIONAL TRANSPORT OFFICE', { align: 'center' });
      
      doc.fontSize(16).font('Helvetica-Bold')
         .text('APPLICATION FOR DRIVING LICENSE', { align: 'center' });
      
      doc.fontSize(12).font('Helvetica')
         .text('Form No. 2 (Learner\'s License) / Form No. 4 (Permanent License)', { align: 'center' })
         .moveDown(2);

      // Application photo box
      doc.rect(450, 100, 100, 120).stroke();
      doc.fontSize(10).text('Paste Recent\nPassport Size\nPhotograph', 455, 140);

      // Form fields
      const fields = [
        ['License Type', formData.license_type || ''],
        ['Vehicle Class', formData.vehicle_class || ''],
        ['Full Name', formData.full_name || ''],
        ['Father\'s Name', formData.father_name || ''],
        ['Date of Birth', formData.dob || ''],
        ['Mobile Number', formData.mobile || ''],
        ['Blood Group', formData.blood_group || ''],
        ['Address', formData.address || '']
      ];

      let yPosition = 250;
      
      fields.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`${label}:`, 50, yPosition, { width: 150 });
        
        doc.fontSize(12).font('Helvetica')
           .text(value, 200, yPosition, { width: 200 });
           
        yPosition += 25;
      });

      // Signature section
      doc.moveDown(3)
         .text('Applicant Signature: _________________________', 50, yPosition + 50)
         .text('Date: _________________________', 300, yPosition + 50)
         .moveDown(2)
         .fontSize(10)
         .text('Required Documents: Age Proof, Address Proof, Passport Size Photos, Medical Certificate')
         .text('Processing Fee: ₹200 (Learner\'s), ₹500 (Permanent)')
         .text('Processing Time: 7-15 days')
         .moveDown()
         .fontSize(8)
         .text(`Generated by IntelliForm AI on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

const generatePassportPDF = (formData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = require('fs').createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('MINISTRY OF EXTERNAL AFFAIRS', { align: 'center' });
      
      doc.fontSize(16).font('Helvetica-Bold')
         .text('GOVERNMENT OF INDIA', { align: 'center' });
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('APPLICATION FOR INDIAN PASSPORT', { align: 'center' })
         .moveDown(2);

      // Form fields
      const fields = [
        ['Passport Type', formData.passport_type || ''],
        ['Booklet Type', formData.booklet_type || ''],
        ['Full Name', formData.full_name || ''],
        ['Father\'s Name', formData.father_name || ''],
        ['Mother\'s Name', formData.mother_name || ''],
        ['Date of Birth', formData.dob || ''],
        ['Place of Birth', formData.place_of_birth || ''],
        ['Address', formData.address || '']
      ];

      let yPosition = doc.y;
      
      fields.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`${label}:`, 50, yPosition, { width: 150 });
        
        doc.fontSize(12).font('Helvetica')
           .text(value, 200, yPosition, { width: 300 });
           
        yPosition += 30;
      });

      // Footer
      doc.moveDown(3)
         .fontSize(10)
         .text('Required Documents: Birth Certificate, Address Proof, Identity Proof')
         .text('Processing Fee: ₹1500 (36 pages), ₹2000 (60 pages)')
         .text('Processing Time: 30-45 days')
         .moveDown(2)
         .text('Applicant Signature: _________________________', { align: 'right' })
         .text('Date: _________________________', { align: 'right' })
         .moveDown()
         .fontSize(8)
         .text(`Generated by IntelliForm AI on ${new Date().toLocaleString()}`, { align: 'center' });

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
      
    } catch (error) {
      reject(error);
    }
  });
};

// Session Management Functions (same as V2.0)
function createSession(sessionId = null) {
  const id = sessionId || uuidv4();
  const session = {
    id: id,
    createdAt: new Date(),
    lastActivity: new Date(),
    state: 'INIT',
    conversation: [],
    currentForm: null,
    formData: {},
    currentField: 0,
    metadata: {},
    generatedFiles: [] // New: track generated files
  };
  
  sessions.set(id, session);
  console.log(`📝 Created session: ${id}`);
  return session;
}

function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    return createSession(sessionId);
  }
  
  const session = sessions.get(sessionId);
  session.lastActivity = new Date();
  return session;
}

function updateSession(sessionId, updates) {
  const session = getSession(sessionId);
  Object.assign(session, updates);
  session.lastActivity = new Date();
  sessions.set(sessionId, session);
  return session;
}

// Replace your entire callClaudeAI function with this enhanced version:

async function callClaudeAI(userMessage, session) {
    try {
      console.log(`🤖 Processing message for session ${session.id}: "${userMessage}"`);
      
      const conversationHistory = session.conversation.slice(-6); // Increased context
      const contextString = conversationHistory.map(msg => 
        `${msg.type}: ${msg.content}`
      ).join('\n');
  
      // 🔥 UNIVERSAL SYSTEM PROMPT - Works for ANY Indian government form
      const systemPrompt = `You are IntelliForm AI, an expert assistant for ALL Indian government forms and documents.
  
  CURRENT SESSION STATE:
  - State: ${session.state}
  - Current Form: ${session.currentForm || 'none'}
  - Progress: ${session.currentField}/${session.dynamicFormDetails?.total_fields || 'unknown'}
  - Collected: ${Object.keys(session.formData).join(', ') || 'none'}
  
  CONVERSATION HISTORY:
  ${contextString}
  
  USER MESSAGE: "${userMessage}"
  
  🎯 CAPABILITIES: You can help with ANY Indian government form including:
  - FSSAI Food License, GST Registration, Company Registration
  - PAN Card, Passport, Driving License, Aadhaar
  - Trademark Registration, Import/Export License  
  - Property Registration, Marriage Certificate
  - Income Certificate, Caste Certificate
  - Any other government form or document
  
  📋 FORM DISCOVERY RULES:
  1. If user mentions ANY government form/service, help them immediately
  2. Research the form requirements using your knowledge
  3. Create a structured form definition with specific fields
  4. Ask VERY SPECIFIC questions to avoid confusion
  
  ❗ QUESTION CLARITY RULES:
  - NEVER ask just "address" - specify: "POSTAL address", "BUSINESS address", "EMAIL address"
  - NEVER ask generic questions - be specific about what type of information you need
  - Always clarify the format expected (DD/MM/YYYY for dates, name@email.com for emails)
  - If user gives wrong type of info, politely redirect with clear instructions
  
  📊 RESPONSE FORMAT - Always respond with valid JSON:
  {
    "intent": "form_discovery|field_collection|clarification_needed|validation_error",
    "form_type": "descriptive_form_name (e.g., fssai_food_license, gst_registration)",
    "form_details": {
      "name": "Official form name",
      "authority": "Issuing government department",
      "form_number": "Official form number if known",
      "fields_required": ["field1", "field2", "field3"],
      "documents_needed": ["doc1", "doc2"],
      "fees": "Fee information",
      "processing_time": "Time required",
      "total_fields": 8
    },
    "next_action": "start_collection|ask_next_field|clarify_requirement",
    "current_question": "Very specific question to ask user",
    "field_being_asked": "exact_field_name",
    "message": "Conversational response to user",
    "validation_passed": true,
    "confidence": 0.9
  }
  
  🎯 EXAMPLES OF GOOD SPECIFIC QUESTIONS:
  ❌ BAD: "What is your address?"
  ✅ GOOD: "What is your complete RESIDENTIAL postal address? (Include house number, street, city, state, pincode)"
  
  ❌ BAD: "What is your email?"  
  ✅ GOOD: "What is your EMAIL address? (Electronic mail like name@example.com, not postal address)"
  
  ❌ BAD: "Tell me about your business"
  ✅ GOOD: "What is the exact name of your business as you want it to appear on the license?"
  
  🔍 FORM RESEARCH EXAMPLES:
  If user says "I need FSSAI license":
  1. Identify: FSSAI Food Safety License
  2. Authority: Food Safety and Standards Authority of India
  3. Fields: business_name, owner_name, business_postal_address, owner_postal_address, email_address, business_phone, food_category, license_type
  4. Documents: Business address proof, Owner ID proof, NOC from local authority
  5. Ask first specific question about license type
  
  If user says "I need company registration":
  1. Identify: Company Registration (ROC)
  2. Authority: Registrar of Companies, Ministry of Corporate Affairs
  3. Fields: company_name, registered_office_address, directors_details, share_capital, business_activity
  4. Ask first specific question about company type
  
  ALWAYS be helpful, accurate, and specific. Use your knowledge of Indian government procedures.`;
  
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000, // Increased for detailed responses
        temperature: 0.2,  // Lower for more consistent responses
        messages: [{
          role: "user",
          content: systemPrompt
        }]
      };
  
      const modelIds = [
        'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
      ];
  
      for (const modelId of modelIds) {
        try {
          console.log(`🔄 Trying model: ${modelId}`);
          
          const command = new InvokeModelCommand({
            modelId: modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
          });
  
          const response = await bedrockClient.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          
          let claudeResponse = '';
          if (responseBody.content && responseBody.content[0]) {
            claudeResponse = responseBody.content[0].text;
          } else if (responseBody.completion) {
            claudeResponse = responseBody.completion;
          }
  
          console.log(`✅ Success with ${modelId}`);
          console.log(`🧠 Claude response preview: ${claudeResponse.substring(0, 200)}...`);
          
          try {
            // Clean the response - sometimes Claude adds extra text
            let cleanResponse = claudeResponse;
            
            // Find JSON in the response
            const jsonStart = cleanResponse.indexOf('{');
            const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
              cleanResponse = cleanResponse.substring(jsonStart, jsonEnd);
            }
            
            const parsed = JSON.parse(cleanResponse);
            
            // Store dynamic form details in session
            if (parsed.form_details && parsed.form_type) {
              console.log(`📋 Discovered form: ${parsed.form_type} - ${parsed.form_details.name}`);
            }
            
            return parsed;
          } catch (parseError) {
            console.log(`⚠️ JSON parse failed: ${parseError.message}`);
            console.log(`Raw response: ${claudeResponse}`);
            return analyzeUniversalTextResponse(claudeResponse, userMessage, session);
          }
  
        } catch (error) {
          console.log(`❌ Model ${modelId} failed: ${error.message}`);
          continue;
        }
      }
  
      throw new Error('All Claude models failed');
  
    } catch (error) {
      console.error('❌ Claude API Error:', error.message);
      return universalFallback(userMessage, session);
    }
  }
  
  // Enhanced text response analysis for universal forms
  function analyzeUniversalTextResponse(text, userMessage, session) {
    const input = userMessage.toLowerCase();
    
    // Universal form detection - covers many more forms
    const governmentFormKeywords = {
      // Food & Safety
      'fssai': { type: 'fssai_food_license', name: 'FSSAI Food License' },
      'food license': { type: 'fssai_food_license', name: 'FSSAI Food License' },
      'food safety': { type: 'fssai_food_license', name: 'FSSAI Food License' },
      'restaurant license': { type: 'fssai_food_license', name: 'FSSAI Food License' },
      
      // Business Registration
      'gst': { type: 'gst_registration', name: 'GST Registration' },
      'goods and services tax': { type: 'gst_registration', name: 'GST Registration' },
      'company registration': { type: 'company_registration', name: 'Company Registration' },
      'business registration': { type: 'business_registration', name: 'Business Registration' },
      'partnership': { type: 'partnership_registration', name: 'Partnership Registration' },
      'llp': { type: 'llp_registration', name: 'LLP Registration' },
      
      // Intellectual Property
      'trademark': { type: 'trademark_registration', name: 'Trademark Registration' },
      'copyright': { type: 'copyright_registration', name: 'Copyright Registration' },
      'patent': { type: 'patent_application', name: 'Patent Application' },
      
      // Licenses
      'import export': { type: 'import_export_license', name: 'Import Export License' },
      'iec': { type: 'import_export_license', name: 'Import Export Code' },
      'drug license': { type: 'drug_license', name: 'Drug License' },
      'shop establishment': { type: 'shop_establishment_license', name: 'Shop & Establishment License' },
      
      // Personal Documents
      'pan': { type: 'pan_card', name: 'PAN Card' },
      'passport': { type: 'passport', name: 'Passport' },
      'driving': { type: 'driving_license', name: 'Driving License' },
      'aadhaar': { type: 'aadhaar_card', name: 'Aadhaar Card' },
      'voter': { type: 'voter_id', name: 'Voter ID Card' },
      
      // Certificates
      'income certificate': { type: 'income_certificate', name: 'Income Certificate' },
      'caste certificate': { type: 'caste_certificate', name: 'Caste Certificate' },
      'domicile': { type: 'domicile_certificate', name: 'Domicile Certificate' },
      'marriage certificate': { type: 'marriage_certificate', name: 'Marriage Certificate' },
      'birth certificate': { type: 'birth_certificate', name: 'Birth Certificate' },
      'death certificate': { type: 'death_certificate', name: 'Death Certificate' }
    };
    
    let detectedForm = null;
    for (const [keyword, formInfo] of Object.entries(governmentFormKeywords)) {
      if (input.includes(keyword)) {
        detectedForm = formInfo;
        break;
      }
    }
    
    if (session.state === 'COLLECTING') {
      return {
        intent: 'field_collection',
        form_type: session.currentForm,
        message: `Thank you for providing that information.`,
        validation_passed: true,
        confidence: 0.8
      };
    }
    
    if (detectedForm) {
      const formDetails = generateUniversalFormDetails(detectedForm.type, detectedForm.name);
      
      return {
        intent: 'form_discovery',
        form_type: detectedForm.type,
        form_details: formDetails,
        current_question: generateFirstQuestion(detectedForm.type),
        message: `I can help you with ${detectedForm.name}. Let me gather the required information.`,
        validation_passed: true,
        confidence: 0.8
      };
    }
    
    return {
      intent: 'clarification_needed',
      message: "I can help you with any Indian government form or document. This includes FSSAI food license, GST registration, company registration, trademark, PAN card, passport, driving license, and many more. What specific form do you need help with?",
      confidence: 0.6
    };
  }
  
  // Generate form details for any government form
  function generateUniversalFormDetails(formType, formName) {
    const formTemplates = {
      'fssai_food_license': {
        name: "FSSAI Food License",
        authority: "Food Safety and Standards Authority of India (FSSAI)",
        form_number: "Form A/B/C (based on license type)",
        fields_required: [
          "license_type", "business_name", "owner_name", "business_postal_address", 
          "owner_postal_address", "email_address", "business_phone", "food_category", "business_type"
        ],
        documents_needed: [
          "Identity Proof of Owner", "Business Address Proof", "NOC from Local Authority",
          "Water Test Report", "Layout Plan of Business Premises"
        ],
        fees: "₹100 (Basic Registration), ₹2000-5000 (State License), ₹7500+ (Central License)",
        processing_time: "7-60 days depending on license type",
        total_fields: 9
      },
      'gst_registration': {
        name: "GST Registration",
        authority: "Goods and Services Tax Network (GSTN)",
        form_number: "GST REG-01",
        fields_required: [
          "business_name", "business_type", "pan_number", "business_postal_address",
          "proprietor_name", "email_address", "mobile_number", "bank_details", "expected_turnover"
        ],
        documents_needed: [
          "PAN Card", "Business Address Proof", "Bank Account Statement", 
          "Identity Proof", "Business Registration Certificate"
        ],
        fees: "Free (for online registration)",
        processing_time: "3-7 working days",
        total_fields: 9
      },
      'company_registration': {
        name: "Company Registration",
        authority: "Registrar of Companies (ROC), Ministry of Corporate Affairs",
        form_number: "INC-32 (SPICe+)",
        fields_required: [
          "company_name", "company_type", "registered_office_address", "authorized_capital",
          "director_details", "business_activity", "email_address", "mobile_number"
        ],
        documents_needed: [
          "Directors' PAN & Aadhaar", "Registered Office Address Proof", 
          "NOC from Property Owner", "Digital Signature Certificate"
        ],
        fees: "₹4000-10000 (depending on authorized capital)",
        processing_time: "10-15 working days",
        total_fields: 8
      }
    };
    
    return formTemplates[formType] || {
      name: formName,
      authority: "Government of India",
      form_number: "As applicable",
      fields_required: [
        "applicant_name", "postal_address", "email_address", "mobile_number", 
        "relevant_details", "supporting_information"
      ],
      documents_needed: ["Identity Proof", "Address Proof", "Supporting Documents"],
      fees: "As applicable",
      processing_time: "15-30 working days",
      total_fields: 6
    };
  }
  
  // Generate appropriate first question for any form
  function generateFirstQuestion(formType) {
    const firstQuestions = {
      'fssai_food_license': 'What type of FSSAI license do you need? (Basic Registration for turnover <₹12 lakh, State License for ₹12 lakh-₹20 crore, or Central License for >₹20 crore)',
      'gst_registration': 'What type of business entity are you registering for GST? (Proprietorship, Partnership, Private Limited Company, etc.)',
      'company_registration': 'What type of company do you want to register? (Private Limited, Public Limited, One Person Company, etc.)',
      'trademark_registration': 'What do you want to register as a trademark? (Brand name, logo, slogan, etc.)',
      'import_export_license': 'What type of Import Export Code (IEC) do you need? (Individual, Partnership, Company, etc.)'
    };
    
    return firstQuestions[formType] || 'What is the full legal name of the applicant for this form?';
  }
  
  // Universal fallback for any government form
  function universalFallback(userMessage, session) {
    const message = userMessage.toLowerCase();
    
    // Try to detect any government-related keywords
    const govKeywords = ['license', 'registration', 'certificate', 'card', 'permit', 'application', 'form'];
    const hasGovKeyword = govKeywords.some(keyword => message.includes(keyword));
    
    if (hasGovKeyword) {
      return {
        intent: 'form_discovery',
        form_type: 'general_government_form',
        message: `I can help you with government forms and documents. Could you please specify exactly which form or certificate you need? For example: "FSSAI food license", "GST registration", "company registration", etc.`,
        confidence: 0.5
      };
    }
    
    return {
      intent: 'clarification_needed',
      message: "I'm your government form assistant. I can help you with any Indian government form including FSSAI food license, GST registration, PAN card, passport, driving license, company registration, trademark registration, and many more. What specific government form or document do you need?",
      confidence: 0.4
    };
  }
// Helper functions (same as V2.0)
function analyzeTextResponse(text, userMessage, session) {
  const formType = detectFormFromText(text + ' ' + userMessage);
  
  if (session.state === 'COLLECTING' && session.currentForm) {
    return {
      intent: 'field_collection',
      form_type: session.currentForm,
      next_action: 'collect_field',
      message: `Thank you for providing that information. ${text}`,
      confidence: 0.8,
      validation_passed: true
    };
  }
  
  return {
    intent: formType ? 'form_application' : 'clarification_needed',
    form_type: formType,
    next_action: formType ? 'ask_question' : 'clarify_intent',
    message: text || "I can help you with government forms like PAN card, driving license, or passport. What do you need?",
    confidence: formType ? 0.8 : 0.5,
    validation_passed: true
  };
}

function smartFormDetection(userMessage, session) {
  const message = userMessage.toLowerCase();
  
  if (session.state === 'COLLECTING' && session.currentForm) {
    const form = governmentForms[session.currentForm];
    const currentField = form.fields[session.currentField];
    
    return {
      intent: 'field_collection',
      form_type: session.currentForm,
      next_action: 'collect_field',
      message: `Thank you! I've recorded your ${currentField.name.replace('_', ' ')}.`,
      field_name: currentField.name,
      confidence: 0.9,
      validation_passed: validateField(currentField, userMessage)
    };
  }
  
  for (const [formKey, formData] of Object.entries(governmentForms)) {
    for (const keyword of formData.keywords) {
      if (message.includes(keyword)) {
        return {
          intent: 'form_application',
          form_type: formKey,
          next_action: 'ask_question',
          message: `I can help you with ${formData.name} application from ${formData.authority}. Let's get started!`,
          confidence: 0.8,
          validation_passed: true
        };
      }
    }
  }

  return {
    intent: 'clarification_needed',
    form_type: null,
    next_action: 'clarify_intent',
    message: "I can help you with government forms like PAN card, driving license, or passport. What specific form do you need help with?",
    confidence: 0.5,
    validation_passed: true
  };
}

function detectFormFromText(text) {
  const lowerText = text.toLowerCase();
  
  for (const [formKey, formData] of Object.entries(governmentForms)) {
    for (const keyword of formData.keywords) {
      if (lowerText.includes(keyword)) {
        return formKey;
      }
    }
  }
  return null;
}

function validateField(field, value) {
  if (!field.required && !value.trim()) return true;
  
  switch (field.type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'phone':
      return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ''));
    case 'date':
      return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
    default:
      return value.trim().length > 0;
  }
}

// Enhanced conversation processing with PDF generation
// Replace your processConversation function with this universal version:

function processConversation(aiResponse, session, userMessage) {
    const result = {
      response: aiResponse,
      session: session,
      actions: []
    };
  
    session.conversation.push(
      { type: 'user', content: userMessage, timestamp: new Date() },
      { type: 'bot', content: aiResponse.message, timestamp: new Date() }
    );
  
    switch (aiResponse.intent) {
      case 'form_discovery':
        if (aiResponse.form_type && aiResponse.form_details) {
          // Store the discovered form details
          updateSession(session.id, {
            state: 'COLLECTING',
            currentForm: aiResponse.form_type,
            currentField: 0,
            formData: {},
            dynamicFormDetails: aiResponse.form_details
          });
          
          console.log(`📋 Form discovered: ${aiResponse.form_details.name}`);
          
          result.actions.push({
            type: 'start_universal_form',
            formType: aiResponse.form_type,
            formDetails: aiResponse.form_details,
            nextQuestion: aiResponse.current_question || generateUniversalFirstQuestion(aiResponse.form_type)
          });
        }
        break;
  
      case 'field_collection':
        if (session.currentForm && session.dynamicFormDetails) {
          // Determine current field name
          const fieldName = aiResponse.field_being_asked || 
                            session.dynamicFormDetails.fields_required[session.currentField] || 
                            `field_${session.currentField}`;
          
          // Store the user's response
          session.formData[fieldName] = userMessage;
          session.currentField += 1;
          
          const totalFields = session.dynamicFormDetails.total_fields || 
                             session.dynamicFormDetails.fields_required.length;
          
          if (session.currentField >= totalFields) {
            // Form complete
            updateSession(session.id, { state: 'COMPLETE' });
            result.actions.push({
              type: 'universal_form_complete',
              formData: session.formData,
              formType: session.currentForm,
              formDetails: session.dynamicFormDetails
            });
          } else {
            // Ask next question
            const nextFieldName = session.dynamicFormDetails.fields_required[session.currentField];
            const nextQuestion = aiResponse.current_question || 
                                generateUniversalQuestion(nextFieldName, session.currentForm);
            
            result.actions.push({
              type: 'ask_universal_question',
              question: nextQuestion,
              fieldName: nextFieldName,
              fieldNumber: session.currentField + 1,
              totalFields: totalFields
            });
          }
          
          updateSession(session.id, session);
        }
        break;
  
      case 'validation_error':
        result.actions.push({
          type: 'validation_error',
          message: aiResponse.message,
          retry_question: aiResponse.current_question
        });
        break;
  
      case 'clarification_needed':
        result.actions.push({
          type: 'clarification_needed',
          message: aiResponse.message
        });
        break;
    }
  
    return result;
  }
  
  // Generate appropriate questions for any form field
  function generateUniversalQuestion(fieldName, formType) {
    // Specific questions based on field name and context
    const universalQuestions = {
      // Contact Information
      'email_address': 'What is your EMAIL address? (Electronic mail like name@example.com)',
      'mobile_number': 'What is your mobile phone number? (10-digit number)',
      'business_phone': 'What is your business phone number?',
      
      // Address Fields (Very Specific)
      'postal_address': 'What is your complete POSTAL address? (Include house/building number, street, area, city, state, and pincode)',
      'business_postal_address': 'What is your complete BUSINESS address? (Include building number, street, area, city, state, and pincode)',
      'owner_postal_address': 'What is your complete RESIDENTIAL address? (Include house number, street, city, state, and pincode)',
      'registered_office_address': 'What is the complete REGISTERED OFFICE address? (Include building number, street, area, city, state, and pincode)',
      
      // Personal Information
      'applicant_name': 'What is your full legal name as it appears on your official documents?',
      'owner_name': 'What is the full name of the business owner/proprietor?',
      'proprietor_name': 'What is the full name of the proprietor?',
      'business_name': 'What is the exact name of your business/company?',
      'company_name': 'What is your proposed company name?',
      
      // Business Specific
      'business_type': 'What type of business do you operate? (Manufacturing, Trading, Service, etc.)',
      'company_type': 'What type of company? (Private Limited, Public Limited, One Person Company, etc.)',
      'food_category': 'What type of food business? (Restaurant, Catering, Manufacturing, Trading, etc.)',
      'license_type': 'What type of license do you need?',
      'business_activity': 'What is the main business activity/nature of business?',
      
      // Financial
      'authorized_capital': 'What is the proposed authorized capital amount?',
      'expected_turnover': 'What is your expected annual business turnover?',
      'bank_details': 'What are your business bank account details? (Bank name, account number, IFSC)',
      
      // Identification
      'pan_number': 'What is your PAN (Permanent Account Number)? (Format: AAAAA9999A)',
      'aadhaar_number': 'What is your Aadhaar number? (12-digit number)',
      
      // Dates
      'date_of_birth': 'What is your date of birth? (DD/MM/YYYY format)',
      'incorporation_date': 'When do you want to incorporate the company? (DD/MM/YYYY)',
      
      // Other Details
      'director_details': 'Who are the proposed directors? (Please provide names and details)',
      'relevant_details': 'Please provide any other relevant details for this application',
      'supporting_information': 'Do you have any additional supporting information?'
    };
    
    // Context-specific questions for certain forms
    const contextQuestions = {
      'fssai_food_license': {
        'business_name': 'What is the name of your food business as you want it to appear on the FSSAI license?',
        'food_category': 'What type of food business are you operating? (Restaurant, Food Manufacturing, Catering, Online Food Business, etc.)'
      },
      'gst_registration': {
        'business_name': 'What is your business name for GST registration?',
        'business_type': 'What type of business entity? (Proprietorship, Partnership, Private Limited Company, etc.)'
      },
      'company_registration': {
        'company_name': 'What is your proposed company name? (It should end with Private Limited)',
        'business_activity': 'What will be the main business activity of your company?'
      }
    };
    
    // Check for context-specific question first
    if (contextQuestions[formType] && contextQuestions[formType][fieldName]) {
      return contextQuestions[formType][fieldName];
    }
    
    // Return universal question or generate generic one
    return universalQuestions[fieldName] || 
           `Please provide your ${fieldName.replace(/_/g, ' ')}:`;
  }
  
  // Generate first question for any form type
  function generateUniversalFirstQuestion(formType) {
    const firstQuestions = {
      'fssai_food_license': 'What type of FSSAI license do you need? (Basic Registration for turnover <₹12 lakh, State License for ₹12 lakh-₹20 crore, or Central License for >₹20 crore)',
      'gst_registration': 'What type of business entity are you registering for GST? (Proprietorship, Partnership, Private Limited Company, etc.)',
      'company_registration': 'What type of company do you want to register? (Private Limited, Public Limited, One Person Company, etc.)',
      'trademark_registration': 'What do you want to register as a trademark? (Word mark, Logo, Device mark, etc.)',
      'import_export_license': 'Are you applying as an Individual, Partnership, or Company for the Import Export Code?',
      'shop_establishment_license': 'What type of establishment are you registering? (Shop, Office, Commercial Establishment, etc.)',
      'drug_license': 'What type of drug license do you need? (Manufacturing, Trading, Retail, etc.)',
      'income_certificate': 'For whom do you need the income certificate? (Self, Family member, etc.)',
      'caste_certificate': 'What is the category you belong to? (SC, ST, OBC, etc.)',
      'birth_certificate': 'For whom do you need the birth certificate? (Self, Child, etc.)',
      'marriage_certificate': 'What type of marriage certificate do you need? (Registration certificate, Court marriage certificate, etc.)'
    };
    
    return firstQuestions[formType] || 'What is your full legal name for this application?';
  }

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'IntelliForm AI Backend V3.0 - PDF Generation Ready',
    sessions: sessions.size,
    features: ['session_management', 'pdf_generation', 'file_downloads'],
    timestamp: new Date().toISOString()
  });
});

// Enhanced chat endpoint (same as V2.0)
// Replace your chat endpoint with this fixed version
app.post('/api/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: 'Message is required and must be a string' 
        });
      }
  
      const session = getSession(sessionId);
      
      console.log(`📨 Session ${session.id}: "${message}"`);
      
      const aiResponse = await callClaudeAI(message, session);
      const result = processConversation(aiResponse, session, message);
      
      console.log(`📤 Session ${session.id} response:`, aiResponse);
      
      // 🔥 FIXED: Calculate progress for both legacy and universal forms
      let progressText = null;
      if (session.currentForm) {
        let totalFields = 0;
        
        // Check if it's a universal form (dynamically discovered)
        if (session.dynamicFormDetails && session.dynamicFormDetails.total_fields) {
          totalFields = session.dynamicFormDetails.total_fields;
        } 
        // Check if it's a legacy hardcoded form
        else if (governmentForms[session.currentForm] && governmentForms[session.currentForm].fields) {
          totalFields = governmentForms[session.currentForm].fields.length;
        }
        // Fallback for unknown forms
        else {
          totalFields = Object.keys(session.formData).length + 1; // Current fields + 1
        }
        
        progressText = `${session.currentField}/${totalFields}`;
      }
      
      res.json({
        success: true,
        sessionId: session.id,
        response: aiResponse,
        actions: result.actions,
        sessionState: {
          state: session.state,
          currentForm: session.currentForm,
          progress: progressText,
          formType: session.dynamicFormDetails ? 'universal' : 'legacy',
          formName: session.dynamicFormDetails?.name || governmentForms[session.currentForm]?.name
        },
        timestamp: new Date().toISOString()
      });
  
    } catch (error) {
      console.error('❌ Chat endpoint error:', error);
      
      res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: 'Sorry, I encountered an error. Please try again.',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// 🔥 UNIVERSAL PDF GENERATOR - Works for ANY Government Form
// Add this function to your server.js file

const generateUniversalPDF = (formData, formDetails, outputPath) => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        const stream = require('fs').createWriteStream(outputPath);
        doc.pipe(stream);
  
        // 🏛️ GOVERNMENT HEADER - Universal for all forms
        doc.fontSize(18).font('Helvetica-Bold')
           .text('GOVERNMENT OF INDIA', { align: 'center' });
        
        doc.fontSize(14).font('Helvetica-Bold')
           .text(formDetails.authority.toUpperCase(), { align: 'center' });
        
        doc.fontSize(12).font('Helvetica-Bold')
           .text(formDetails.name.toUpperCase(), { align: 'center' });
        
        if (formDetails.form_number && formDetails.form_number !== 'As applicable') {
          doc.fontSize(10).font('Helvetica')
             .text(`Form No. ${formDetails.form_number}`, { align: 'center' });
        }
        
        doc.moveDown(2);
  
        // 📄 APPLICATION DETAILS BOX
        const currentY = doc.y;
        doc.rect(50, currentY, 495, 30).fillAndStroke('#f0f0f0', '#000000');
        doc.fillColor('#000000')
           .fontSize(12).font('Helvetica-Bold')
           .text('APPLICATION DETAILS', 60, currentY + 10);
        
        doc.moveDown(1.5);
  
        // 📋 FORM FIELDS - Dynamic based on collected data
        let yPosition = doc.y + 10;
        const leftMargin = 70;
        const rightMargin = 300;
        
        // Convert form data to readable format
        const formattedFields = Object.entries(formData).map(([key, value]) => {
          // Convert field names to readable labels
          const label = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Email Address', 'Email Address (Electronic Mail)')
            .replace('Mobile Number', 'Mobile/Phone Number')
            .replace('Postal Address', 'Complete Postal Address')
            .replace('Business Postal Address', 'Business Address')
            .replace('Owner Postal Address', 'Owner/Proprietor Address');
          
          return [label, value || 'Not Provided'];
        });
  
        formattedFields.forEach(([label, value]) => {
          // Check if we need a new page
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 80;
          }
  
          // Field label (bold)
          doc.fontSize(11).font('Helvetica-Bold')
             .text(`${label}:`, leftMargin, yPosition, { width: 200 });
          
          // Field value
          doc.fontSize(11).font('Helvetica')
             .text(String(value), rightMargin, yPosition, { width: 250 });
             
          yPosition += 25;
        });
  
        // 📋 REQUIRED DOCUMENTS SECTION
        yPosition += 20;
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 80;
        }
  
        doc.rect(50, yPosition, 495, 30).fillAndStroke('#e6f3ff', '#0066cc');
        doc.fillColor('#000000')
           .fontSize(12).font('Helvetica-Bold')
           .text('REQUIRED DOCUMENTS', 60, yPosition + 10);
        
        yPosition += 45;
        
        formDetails.documents_needed.forEach((document, index) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 80;
          }
          
          doc.fontSize(10).font('Helvetica')
             .text(`${index + 1}. ${document}`, leftMargin, yPosition);
          yPosition += 18;
        });
  
        // 💰 PROCESSING INFORMATION
        yPosition += 20;
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 80;
        }
  
        doc.rect(50, yPosition, 495, 30).fillAndStroke('#fff2e6', '#ff6600');
        doc.fillColor('#000000')
           .fontSize(12).font('Helvetica-Bold')
           .text('PROCESSING INFORMATION', 60, yPosition + 10);
        
        yPosition += 45;
  
        const processingInfo = [
          ['Processing Fee', formDetails.fees],
          ['Processing Time', formDetails.processing_time],
          ['Issuing Authority', formDetails.authority]
        ];
  
        processingInfo.forEach(([label, info]) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 80;
          }
          
          doc.fontSize(10).font('Helvetica-Bold')
             .text(`${label}:`, leftMargin, yPosition, { width: 150 });
          
          doc.fontSize(10).font('Helvetica')
             .text(info, rightMargin, yPosition, { width: 250 });
             
          yPosition += 20;
        });
  
        // ✍️ SIGNATURE SECTION
        yPosition += 30;
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 80;
        }
  
        doc.fontSize(11).font('Helvetica-Bold')
           .text('APPLICANT DECLARATION', leftMargin, yPosition);
        
        yPosition += 25;
        
        doc.fontSize(9).font('Helvetica')
           .text('I hereby declare that the information provided above is true and correct to the best of my knowledge.', 
                 leftMargin, yPosition, { width: 450 });
        
        yPosition += 40;
        
        // Signature boxes
        doc.rect(leftMargin, yPosition, 200, 30).stroke();
        doc.fontSize(9).font('Helvetica')
           .text('Applicant Signature', leftMargin + 5, yPosition + 35);
        
        doc.rect(rightMargin + 50, yPosition, 120, 30).stroke();
        doc.fontSize(9).font('Helvetica')
           .text('Date', rightMargin + 85, yPosition + 35);
  
        // 🤖 FOOTER
        yPosition += 80;
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 80;
        }
  
        doc.fontSize(8).font('Helvetica')
           .fillColor('#666666')
           .text(`Generated by IntelliForm AI V3.0 on ${new Date().toLocaleString('en-IN', {
             timeZone: 'Asia/Kolkata',
             day: '2-digit',
             month: '2-digit', 
             year: 'numeric',
             hour: '2-digit',
             minute: '2-digit'
           })}`, { align: 'center' });
        
        doc.text('This is a computer-generated form. Please verify all details before submission.', { align: 'center' });
  
        doc.end();
        
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
        
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // 🔧 UPDATED PDF GENERATION ENDPOINT
  // Replace your existing /api/generate-pdf endpoint with this:
  
  app.post('/api/generate-pdf', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      const session = sessions.get(sessionId);
      if (!session || session.state !== 'COMPLETE') {
        return res.status(400).json({ error: 'Session not found or form not complete' });
      }
      
      console.log(`📄 Generating PDF for session ${sessionId}, form: ${session.currentForm}`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const formType = session.currentForm || 'government_form';
      const filename = `${formType}_${sessionId.substring(0, 8)}_${timestamp}.pdf`;
      const outputPath = path.join(__dirname, 'downloads', filename);
      
      let pdfPath;
      let formDetails;
      
      // 🔥 UNIVERSAL PDF GENERATION
      if (session.dynamicFormDetails) {
        // Use dynamic form details for universal forms
        formDetails = session.dynamicFormDetails;
        pdfPath = await generateUniversalPDF(session.formData, formDetails, outputPath);
        
        console.log(`✅ Universal PDF generated for: ${formDetails.name}`);
      } 
      // Legacy form handling
      else if (governmentForms[session.currentForm]) {
        const legacyForm = governmentForms[session.currentForm];
        
        // Try legacy PDF generators first
        switch (session.currentForm) {
          case 'pan_card':
            pdfPath = await generatePANCardPDF(session.formData, outputPath);
            formDetails = legacyForm;
            break;
          case 'driving_license':
            pdfPath = await generateDrivingLicensePDF(session.formData, outputPath);
            formDetails = legacyForm;
            break;
          case 'passport':
            pdfPath = await generatePassportPDF(session.formData, outputPath);
            formDetails = legacyForm;
            break;
          default:
            // Fallback to universal generator for legacy forms without specific templates
            formDetails = {
              name: legacyForm.name,
              authority: legacyForm.authority,
              form_number: legacyForm.form_number,
              documents_needed: legacyForm.documents,
              fees: legacyForm.fee,
              processing_time: legacyForm.processing_time
            };
            pdfPath = await generateUniversalPDF(session.formData, formDetails, outputPath);
        }
      } 
      // Fallback for unknown forms
      else {
        formDetails = {
          name: 'Government Form Application',
          authority: 'Government of India',
          form_number: 'Not Specified',
          documents_needed: ['Identity Proof', 'Address Proof', 'Supporting Documents'],
          fees: 'As applicable',
          processing_time: 'As per government norms'
        };
        pdfPath = await generateUniversalPDF(session.formData, formDetails, outputPath);
      }
      
      // Add file to session
      if (!session.generatedFiles) {
        session.generatedFiles = [];
      }
      
      session.generatedFiles.push({
        filename: filename,
        path: pdfPath,
        formType: session.currentForm,
        generatedAt: new Date(),
        downloadUrl: `/api/download/${filename}`
      });
      
      updateSession(sessionId, session);
      
      console.log(`✅ PDF generated successfully: ${filename}`);
      
      res.json({
        success: true,
        filename: filename,
        downloadUrl: `/api/download/${filename}`,
        formType: session.currentForm,
        formName: formDetails.name,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate PDF',
        message: error.message 
      });
    }
  });
// NEW: Download PDF endpoint
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'downloads', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log(`📥 Download requested: ${filename}`);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// NEW: Preview PDF endpoint (for viewing in browser)
app.get('/api/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'downloads', filename);
    
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    console.log(`👁️ Preview requested: ${filename}`);
    
    // Set headers for PDF preview
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Preview error:', error);
    res.status(500).json({ error: 'Failed to preview file' });
  }
});

// Get session info with files
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId: session.id,
    state: session.state,
    currentForm: session.currentForm,
    formData: session.formData,
    progress: session.currentForm ? `${session.currentField}/${governmentForms[session.currentForm].fields.length}` : null,
    generatedFiles: session.generatedFiles || [],
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  });
});

// Get available forms
app.get('/api/forms', (req, res) => {
  res.json({
    success: true,
    forms: Object.entries(governmentForms).map(([key, form]) => ({
      id: key,
      name: form.name,
      authority: form.authority,
      fields: form.fields.length,
      fee: form.fee,
      processing_time: form.processing_time,
      template_available: !!form.template
    }))
  });
});

// NEW: Get all files for a session
app.get('/api/files/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    success: true,
    sessionId: sessionId,
    files: session.generatedFiles || []
  });
});

// NEW: Delete file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'downloads', filename);
    
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted file: ${filename}`);
      
      // Remove from all sessions
      for (const session of sessions.values()) {
        if (session.generatedFiles) {
          session.generatedFiles = session.generatedFiles.filter(file => file.filename !== filename);
        }
      }
      
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Clean up old sessions and files (run every hour)
const cleanup = async () => {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  const filesToDelete = [];
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > oneHour) {
      // Mark files for deletion
      if (session.generatedFiles) {
        filesToDelete.push(...session.generatedFiles.map(file => file.filename));
      }
      
      sessions.delete(sessionId);
      console.log(`🗑️ Cleaned up session: ${sessionId}`);
    }
  }
  
  // Delete old files
  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(__dirname, 'downloads', filename);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted old file: ${filename}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`❌ Failed to delete ${filename}:`, error.message);
      }
    }
  }
};

setInterval(cleanup, 60 * 60 * 1000); // Run every hour

// Initialize
ensureDownloadsDir().then(() => {
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 IntelliForm AI Backend V3.0 running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🌍 AWS Region: ${process.env.AWS_REGION}`);
    console.log(`🗄️ Session store: In-Memory`);
    console.log(`📄 PDF Generation: Enabled`);
    console.log(`📁 Downloads directory: ./downloads`);
    console.log(`✅ Server ready with PDF generation capabilities!`);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});