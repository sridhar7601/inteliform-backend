// aiService.js - LangChain Implementation
const { BedrockChat } = require('@langchain/community/chat_models/bedrock');
const { CallbackHandler } = require('langfuse-langchain');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnableLambda } = require('@langchain/core/runnables');

// Import verified forms database
const { VERIFIED_GOVERNMENT_FORMS } = require('./formsDatabase');

// Initialize Langfuse callback handler
const langfuseHandler = new CallbackHandler({
  publicKey: "pk-lf-61036817-ccbe-4989-a7aa-22f35dd3b9d7",
  secretKey: "sk-lf-53e62775-c833-4471-a4c1-5c3d60b35bf5",
  baseUrl: "https://cloud.langfuse.com",
});

/**
 * Initialize the LangChain LLM with AWS Bedrock Claude
 */
const initLLM = () => {
  return new BedrockChat({
    model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    region: process.env.AWS_REGION || 'us-east-2',
    maxTokens: 2000,
    temperature: 0.1,
    streaming: true,
    callbacks: [langfuseHandler],
  });
};

/**
 * LangChain Prompt Templates
 */
const FORM_DISCOVERY_PROMPT = PromptTemplate.fromTemplate(`
You are IntelliForm AI, a specialized government form assistant with access to verified government form data.

VERIFIED FORMS DATABASE:
{verified_forms_list}

USER REQUEST: "{user_input}"

CONVERSATION CONTEXT:
{conversation_history}

CURRENT SESSION STATE:
- State: {session_state}
- Current Form: {current_form}
- Progress: {progress}

INSTRUCTIONS:
1. ONLY recommend forms that exist in the VERIFIED FORMS DATABASE above
2. If user asks for a form NOT in the database, suggest the closest verified alternative
3. Always validate form requirements against the verified data
4. Be specific about which verified form matches their request

RESPONSE FORMAT (JSON only):
{{
  "intent": "form_discovery|clarification_needed",
  "matched_form_id": "exact_id_from_verified_database_or_null",
  "confidence": 0.0-1.0,
  "message": "response to user",
  "form_name": "human readable form name if matched"
}}

Examples:
- "I need food license" → "fssai_food_license" 
- "GST registration" → "gst_registration"
- "Company registration" → "company_registration"
- "Trademark registration" → null (not in verified database, suggest alternatives)

Respond with ONLY the JSON, no other text.
`);

const FIELD_VALIDATION_PROMPT = PromptTemplate.fromTemplate(`
You are validating user input for a government form field.

FORM: {form_name}
FIELD: {field_name}
FIELD TYPE: {field_type}
REQUIRED: {field_required}
USER INPUT: "{user_input}"

{field_options}

INSTRUCTIONS:
1. Check if the user input is appropriate for this field type
2. For choice fields, check if input matches one of the valid options
3. For email/phone, basic format validation
4. Return validation result as JSON

RESPONSE FORMAT (JSON only):
{{
  "valid": true/false,
  "cleaned_value": "cleaned user input or original",
  "error_message": "specific error if invalid, null if valid"
}}

Respond with ONLY the JSON, no other text.
`);

/**
 * LangChain Helper Functions
 */
const parseJSONOutput = RunnableLambda.from((input) => {
  try {
    // Clean the input string
    let cleanInput = input.trim();
    
    // Find JSON boundaries
    const jsonStart = cleanInput.indexOf('{');
    const jsonEnd = cleanInput.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanInput = cleanInput.substring(jsonStart, jsonEnd);
    }
    
    return JSON.parse(cleanInput);
  } catch (error) {
    console.error('❌ JSON Parse Error:', error);
    return {
      intent: 'error',
      message: 'I had trouble processing that request. Could you please rephrase?',
      confidence: 0.1
    };
  }
});

const addFormContext = RunnableLambda.from((input) => {
  const verifiedFormsList = Object.entries(VERIFIED_GOVERNMENT_FORMS)
    .map(([id, form]) => `${id}: ${form.name} (${form.authority})`)
    .join('\n');
    
  return {
    ...input,
    verified_forms_list: verifiedFormsList
  };
});

/**
 * LangChain Chains
 */
const createFormDiscoveryChain = (llm) => {
  return RunnableSequence.from([
    addFormContext,
    FORM_DISCOVERY_PROMPT,
    llm,
    new StringOutputParser(),
    parseJSONOutput
  ]);
};

const createFieldValidationChain = (llm) => {
  return RunnableSequence.from([
    FIELD_VALIDATION_PROMPT,
    llm,
    new StringOutputParser(),
    parseJSONOutput
  ]);
};

/**
 * Process user message with LangChain
 */
const processUserMessage = async (userMessage, session) => {
  try {
    await session.addMessage('user', userMessage);
    
    // Initialize LLM and chains
    const llm = initLLM();
    const formDiscoveryChain = createFormDiscoveryChain(llm);
    const fieldValidationChain = createFieldValidationChain(llm);
    
    if (session.state === 'INIT' || session.state === 'FORM_DISCOVERY') {
      // Form Discovery Phase
      console.log('🦜 LangChain Form Discovery...');
      
      const conversationHistory = await session.getConversationHistory();
      
      const result = await formDiscoveryChain.invoke({
        user_input: userMessage,
        conversation_history: conversationHistory,
        session_state: session.state,
        current_form: session.currentForm || 'none',
        progress: `${session.currentField}/${session.verifiedFormStructure?.verified_fields.length || 0}`
      });

      console.log('🔍 LangChain Discovery Result:', result);
      
      if (result.matched_form_id && VERIFIED_GOVERNMENT_FORMS[result.matched_form_id]) {
        // Valid form found
        session.currentForm = result.matched_form_id;
        session.verifiedFormStructure = VERIFIED_GOVERNMENT_FORMS[result.matched_form_id];
        session.state = 'COLLECTING';
        session.currentField = 0;
        
        const firstField = session.verifiedFormStructure.verified_fields[0];
        await session.addMessage('ai', result.message);
        
        return {
          intent: 'form_discovered',
          formDetails: session.verifiedFormStructure,
          nextQuestion: firstField.question,
          message: `${result.message}\n\n✅ This form uses VERIFIED government requirements with LangChain validation.\n\nLet's start with the first question:\n\n${firstField.question}`,
          confidence: result.confidence
        };
      } else {
        await session.addMessage('ai', result.message);
        return {
          intent: 'clarification_needed',
          message: result.message,
          confidence: result.confidence
        };
      }
      
    } else if (session.state === 'COLLECTING') {
      // Field Collection Phase
      const currentField = session.verifiedFormStructure.verified_fields[session.currentField];
      
      console.log('🦜 LangChain Field Validation...');
      
      // Use direct validation for simple fields
      const validation = validateFieldInput(currentField, userMessage);
      
      // For complex fields, use LangChain validation
      if (currentField.type === 'complex') {
        const fieldOptions = currentField.options ? 
          `OPTIONS: ${JSON.stringify(currentField.options)}` : '';
          
        const validationResult = await fieldValidationChain.invoke({
          form_name: session.verifiedFormStructure.name,
          field_name: currentField.name,
          field_type: currentField.type,
          field_required: currentField.required,
          user_input: userMessage,
          field_options: fieldOptions
        });
        
        if (!validationResult.valid) {
          return {
            intent: 'validation_error',
            message: validationResult.error_message,
            retryQuestion: currentField.question
          };
        }
        
        // Store validated data
        session.formData[currentField.name] = validationResult.cleaned_value;
      } else {
        // Use direct validation result
        if (!validation.valid) {
          return {
            intent: 'validation_error',
            message: validation.error,
            retryQuestion: currentField.question
          };
        }
        
        // Store validated data
        session.formData[currentField.name] = validation.value;
      }
      
      session.currentField += 1;
      await session.addMessage('ai', 'Thank you! Information recorded.');
      
      // Check if form is complete
      if (session.currentField >= session.verifiedFormStructure.verified_fields.length) {
        session.state = 'COMPLETE';
        return {
          intent: 'form_complete',
          formData: session.formData,
          formDetails: session.verifiedFormStructure,
          message: "🎉 Form completed with LangChain validation! All required information has been collected. You can now generate the PDF."
        };
      } else {
        // Ask next question
        const nextField = session.verifiedFormStructure.verified_fields[session.currentField];
        return {
          intent: 'next_question',
          question: nextField.question,
          progress: `${session.currentField + 1}/${session.verifiedFormStructure.verified_fields.length}`,
          message: `Great! Next question (${session.currentField + 1}/${session.verifiedFormStructure.verified_fields.length}):\n\n${nextField.question}`
        };
      }
    }
    
  } catch (error) {
    console.error('❌ LangChain Processing Error:', error);
    return {
      intent: 'error',
      message: 'I encountered an error processing your request. Please try again.'
    };
  }
};

/**
 * Field validation helper
 */
function validateFieldInput(field, userInput) {
  if (!field.required && !userInput.trim()) return { valid: true, value: userInput };
  
  switch (field.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return { 
        valid: emailRegex.test(userInput), 
        value: userInput,
        error: emailRegex.test(userInput) ? null : "Please provide a valid email address (like name@example.com)"
      };
    
    case 'phone':
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanPhone = userInput.replace(/\D/g, '');
      return { 
        valid: phoneRegex.test(cleanPhone), 
        value: cleanPhone,
        error: phoneRegex.test(cleanPhone) ? null : "Please provide a valid 10-digit Indian mobile number"
      };
    
    case 'choice':
      const validChoice = field.options.some(option => 
        userInput.toLowerCase().includes(option.toLowerCase()) ||
        option.toLowerCase().includes(userInput.toLowerCase())
      );
      return { 
        valid: validChoice, 
        value: userInput,
        error: validChoice ? null : `Please choose from: ${field.options.join(', ')}`
      };
    
    default:
      return { 
        valid: userInput.trim().length > 0, 
        value: userInput.trim(),
        error: userInput.trim().length > 0 ? null : "This field is required"
      };
  }
}

module.exports = {
  processUserMessage
};
