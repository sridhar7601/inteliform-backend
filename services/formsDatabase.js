// formsDatabase.js - Verified Government Forms Database

/**
 * Database of verified government forms with their fields, requirements, and metadata
 */
const VERIFIED_GOVERNMENT_FORMS = {
  "pan_card_application": {
    name: "PAN Card Application",
    authority: "Income Tax Department, Government of India",
    form_number: "Form 49A (Individuals) / Form 49AA (Foreign Citizens)",
    official_website: "https://www.incometax.gov.in/",
    verified_fields: [
      { name: "applicant_category", question: "What category of applicant are you?", type: "choice", 
        options: ["Individual", "HUF", "Company", "Firm", "Trust", "Association of Persons"], required: true },
      { name: "full_name", question: "What is your full name? (As per Aadhaar/ID proof)", type: "text", required: true },
      { name: "father_name", question: "What is your father's full name?", type: "text", required: true },
      { name: "date_of_birth", question: "What is your date of birth? (DD/MM/YYYY format)", type: "text", required: true },
      { name: "mobile_number", question: "What is your mobile number?", type: "phone", required: true },
      { name: "email_address", question: "What is your email address?", type: "email", required: true },
      { name: "address", question: "What is your complete residential address?", type: "textarea", required: true },
      { name: "id_proof", question: "Which ID proof are you submitting?", type: "choice",
        options: ["Aadhaar Card", "Voter ID", "Passport", "Driving License"], required: true },
      { name: "address_proof", question: "Which address proof are you submitting?", type: "choice",
        options: ["Aadhaar Card", "Electricity Bill", "Water Bill", "Passport", "Rental Agreement"], required: true }
    ],
    verified_documents: [
      "Identity Proof (Aadhaar/Voter ID/Passport/Driving License)",
      "Address Proof (Utility Bill/Bank Statement/Rental Agreement)",
      "Recent Passport Size Photograph",
      "Date of Birth Proof (Birth Certificate/School Certificate)",
      "Digital Signature (if applying online)"
    ],
    verified_fees: "₹110 for Indian Citizens (Physical), ₹50 (e-filing), ₹1020 for Foreign Citizens",
    verified_processing_time: "15-30 days",
    last_verified: "2024-08-01"
  },
  
  "passport_application": {
    name: "Passport Application",
    authority: "Passport Seva Kendra, Ministry of External Affairs",
    form_number: "Online Application Form",
    official_website: "https://www.passportindia.gov.in/",
    verified_fields: [
      { name: "application_type", question: "What type of passport application are you submitting?", type: "choice", 
        options: ["Fresh Passport", "Reissue of Passport", "Tatkal Passport"], required: true },
      { name: "full_name", question: "What is your full name? (As per documents)", type: "text", required: true },
      { name: "date_of_birth", question: "What is your date of birth? (DD/MM/YYYY format)", type: "text", required: true },
      { name: "place_of_birth", question: "What is your place of birth? (City and State/Country)", type: "text", required: true },
      { name: "gender", question: "What is your gender?", type: "choice", options: ["Male", "Female", "Other"], required: true },
      { name: "marital_status", question: "What is your marital status?", type: "choice", options: ["Single", "Married", "Divorced", "Widowed"], required: true },
      { name: "address", question: "What is your present residential address?", type: "textarea", required: true },
      { name: "mobile_number", question: "What is your mobile number?", type: "phone", required: true },
      { name: "email_address", question: "What is your email address?", type: "email", required: true },
      { name: "emergency_contact", question: "What is your emergency contact name and number?", type: "text", required: true }
    ],
    verified_documents: [
      "Aadhaar Card",
      "Birth Certificate/10th Certificate (for DOB proof)",
      "Address Proof (Utility Bill/Bank Statement)",
      "Recent Passport Size Photographs (4-6)",
      "Previous Passport (if reissue)"
    ],
    verified_fees: "₹1500 (Normal), ₹3500 (Tatkal), ₹2000 (36-page booklet)",
    verified_processing_time: "7-30 days (Normal), 1-3 days (Tatkal)",
    last_verified: "2024-08-01"
  },
  
  "driving_license": {
    name: "Driving License Application",
    authority: "Regional Transport Office (RTO)",
    form_number: "Form 4 (Learner's License), Form 7 (Permanent License)",
    official_website: "https://parivahan.gov.in/",
    verified_fields: [
      { name: "license_type", question: "What type of driving license are you applying for?", type: "choice", 
        options: ["Learner's License", "Permanent Driving License", "International Driving Permit"], required: true },
      { name: "vehicle_category", question: "For which vehicle category?", type: "choice", 
        options: ["Two Wheeler", "Light Motor Vehicle (Car)", "Commercial Vehicle", "Heavy Vehicle"], required: true },
      { name: "full_name", question: "What is your full name?", type: "text", required: true },
      { name: "father_name", question: "What is your father's/husband's name?", type: "text", required: true },
      { name: "date_of_birth", question: "What is your date of birth? (DD/MM/YYYY format)", type: "text", required: true },
      { name: "blood_group", question: "What is your blood group?", type: "choice", 
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], required: true },
      { name: "address", question: "What is your permanent address?", type: "textarea", required: true },
      { name: "mobile_number", question: "What is your mobile number?", type: "phone", required: true },
      { name: "email_address", question: "What is your email address?", type: "email", required: true }
    ],
    verified_documents: [
      "Age Proof (10th Certificate/Birth Certificate/Aadhaar)",
      "Address Proof (Aadhaar/Utility Bill/Rental Agreement)",
      "Identity Proof (Aadhaar/PAN/Voter ID)",
      "Recent Passport Size Photographs",
      "Medical Certificate (Form 1A)"
    ],
    verified_fees: "₹200 (Learner's License), ₹300-500 (Permanent License)",
    verified_processing_time: "7-30 days",
    last_verified: "2024-08-01"
  },
  
  "voter_id": {
    name: "Voter ID Registration",
    authority: "Election Commission of India",
    form_number: "Form 6",
    official_website: "https://www.nvsp.in/",
    verified_fields: [
      { name: "full_name", question: "What is your full name?", type: "text", required: true },
      { name: "relative_name", question: "What is your father's/mother's/husband's name?", type: "text", required: true },
      { name: "date_of_birth", question: "What is your date of birth? (DD/MM/YYYY format)", type: "text", required: true },
      { name: "gender", question: "What is your gender?", type: "choice", options: ["Male", "Female", "Other"], required: true },
      { name: "current_address", question: "What is your current residential address?", type: "textarea", required: true },
      { name: "permanent_address", question: "What is your permanent address? (If different from current)", type: "textarea", required: false },
      { name: "mobile_number", question: "What is your mobile number?", type: "phone", required: true },
      { name: "email_address", question: "What is your email address?", type: "email", required: false },
      { name: "previous_voter_id", question: "Do you have a previous Voter ID? If yes, provide the number", type: "text", required: false }
    ],
    verified_documents: [
      "Age Proof (Birth Certificate/10th Certificate/Aadhaar)",
      "Address Proof (Utility Bill/Bank Statement/Rental Agreement)",
      "Recent Passport Size Photographs",
      "Previous Voter ID (if applicable for change/correction)"
    ],
    verified_fees: "Free of cost",
    verified_processing_time: "30-60 days",
    last_verified: "2024-08-01"
  },
  "fssai_food_license": {
    name: "FSSAI Food Safety License",
    authority: "Food Safety and Standards Authority of India (FSSAI)",
    form_number: "Form A/B/C",
    official_website: "https://www.fssai.gov.in/",
    verified_fields: [
      { name: "license_type", question: "What type of FSSAI license do you need?", type: "choice", 
        options: ["Basic Registration (<₹12 lakh turnover)", "State License (₹12 lakh - ₹20 crore)", "Central License (>₹20 crore)"], required: true },
      { name: "business_name", question: "What is the exact name of your food business?", type: "text", required: true },
      { name: "owner_name", question: "What is the full name of the business owner/proprietor?", type: "text", required: true },
      { name: "business_address", question: "What is the complete business address? (Include building number, street, area, city, state, pincode)", type: "textarea", required: true },
      { name: "owner_address", question: "What is the owner's residential address?", type: "textarea", required: true },
      { name: "email_address", question: "What is your email address? (Electronic mail like name@example.com)", type: "email", required: true },
      { name: "mobile_number", question: "What is your mobile number? (10-digit Indian mobile number)", type: "phone", required: true },
      { name: "food_category", question: "What type of food business are you operating?", type: "choice",
        options: ["Restaurant/Dhaba", "Catering Services", "Food Manufacturing", "Food Trading/Distribution", "Online Food Business", "Bakery", "Sweet Shop", "Other"], required: true },
      { name: "annual_turnover", question: "What is your expected annual business turnover?", type: "text", required: true }
    ],
    verified_documents: [
      "Identity Proof of Owner (Aadhaar Card/PAN Card)",
      "Business Address Proof (Rent Agreement/Property Documents)", 
      "NOC from Local Authority/Municipal Corporation",
      "Water Test Report (if applicable)",
      "Layout Plan of Business Premises"
    ],
    verified_fees: "₹100 (Basic), ₹2000-5000 (State), ₹7500+ (Central)",
    verified_processing_time: "7-60 days depending on license type",
    last_verified: "2024-01-15"
  },
  
  "gst_registration": {
    name: "GST Registration",
    authority: "Goods and Services Tax Network (GSTN)",
    form_number: "GST REG-01",
    official_website: "https://www.gst.gov.in/",
    verified_fields: [
      { name: "business_type", question: "What type of business entity are you registering?", type: "choice",
        options: ["Proprietorship", "Partnership", "Private Limited Company", "Public Limited Company", "LLP", "Trust", "NGO", "Other"], required: true },
      { name: "business_name", question: "What is your business name for GST registration?", type: "text", required: true },
      { name: "pan_number", question: "What is your PAN number? (Format: AAAAA9999A)", type: "text", required: true },
      { name: "business_address", question: "What is your principal place of business address?", type: "textarea", required: true },
      { name: "proprietor_name", question: "What is the full name of the proprietor/authorized person?", type: "text", required: true },
      { name: "email_address", question: "What is your email address for GST communication?", type: "email", required: true },
      { name: "mobile_number", question: "What is your mobile number?", type: "phone", required: true },
      { name: "bank_account", question: "What are your business bank account details? (Bank name and account number)", type: "text", required: true },
      { name: "business_activity", question: "What is your main business activity?", type: "text", required: true },
      { name: "expected_turnover", question: "What is your expected annual turnover?", type: "text", required: true }
    ],
    verified_documents: [
      "PAN Card of Business/Proprietor",
      "Business Address Proof", 
      "Bank Account Statement/Cancelled Cheque",
      "Identity Proof of Authorized Signatory",
      "Business Registration Certificate (if applicable)"
    ],
    verified_fees: "Free for online registration",
    verified_processing_time: "3-7 working days",
    last_verified: "2024-01-15"
  },

  "company_registration": {
    name: "Private Limited Company Registration",
    authority: "Registrar of Companies (ROC), Ministry of Corporate Affairs",
    form_number: "SPICe+ (INC-32)",
    official_website: "https://www.mca.gov.in/",
    verified_fields: [
      { name: "company_name", question: "What is your proposed company name? (Must end with 'Private Limited')", type: "text", required: true },
      { name: "company_type", question: "What type of company do you want to register?", type: "choice",
        options: ["Private Limited Company", "One Person Company (OPC)", "Public Limited Company", "Limited Liability Partnership (LLP)"], required: true },
      { name: "registered_office", question: "What is the registered office address?", type: "textarea", required: true },
      { name: "authorized_capital", question: "What is the authorized capital amount? (Minimum ₹1,00,000)", type: "text", required: true },
      { name: "director1_name", question: "What is the full name of Director 1?", type: "text", required: true },
      { name: "director1_pan", question: "What is the PAN number of Director 1?", type: "text", required: true },
      { name: "director2_name", question: "What is the full name of Director 2? (Required for Pvt Ltd)", type: "text", required: false },
      { name: "director2_pan", question: "What is the PAN number of Director 2?", type: "text", required: false },
      { name: "business_activity", question: "What will be the main business activity of the company?", type: "text", required: true },
      { name: "email_address", question: "What is the company's email address?", type: "email", required: true }
    ],
    verified_documents: [
      "PAN Card of all Directors",
      "Aadhaar Card of all Directors",
      "Registered Office Address Proof",
      "NOC from Property Owner",
      "Digital Signature Certificate (DSC) of Directors"
    ],
    verified_fees: "₹4,000 - ₹10,000 depending on authorized capital",
    verified_processing_time: "10-15 working days",
    last_verified: "2024-01-15"
  }
};

module.exports = {
  VERIFIED_GOVERNMENT_FORMS
};
