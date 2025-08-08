# IntelliForm Backend

IntelliForm AI Backend V3.0 - PDF Generation & File Management for government forms.

## Overview

This backend service powers the IntelliForm AI application, which helps users complete government forms through an AI-assisted conversation and generates professional PDF documents ready for submission.

## Features

- AI-powered form assistance using Claude AI (AWS Bedrock)
- Dynamic form discovery and field collection
- Professional PDF generation for various government forms
- Session management for multi-step form completion
- File storage and management for generated PDFs
- RESTful API endpoints for frontend integration

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- AWS account with Bedrock access (for Claude AI)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3001
FRONTEND_URL=http://localhost:3000
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_SESSION_TOKEN=your-aws-session-token (if using temporary credentials)
```

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd intelliform-backend
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Running the Application

### Development Mode

```
npm run dev
```

This will start the server with nodemon, which automatically restarts when changes are detected.

### Production Mode

```
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Check if the backend is running

### Chat
- `POST /api/chat` - Send a message to the AI assistant
  - Request body: `{ "message": "string", "sessionId": "string" (optional) }`
  - Response: AI response with session information and actions

### PDF Generation
- `POST /api/generate-pdf` - Generate a PDF for a completed form
  - Request body: `{ "sessionId": "string" }`
  - Response: PDF file information and download URL

### File Management
- `GET /api/download/:filename` - Download a generated PDF file
- `GET /api/preview/:filename` - Preview a generated PDF file in the browser
- `DELETE /api/files/:filename` - Delete a generated PDF file

### Session Management
- `GET /api/session/:sessionId` - Get information about a session
- `GET /api/files/:sessionId` - Get all files generated for a session

### Form Information
- `GET /api/forms` - Get information about available government forms

## Project Structure

- `server.js` - Main entry point and server configuration
- `routes/` - API route handlers
- `services/` - Business logic and external service integrations
- `downloads/` - Directory for storing generated PDF files

## Supported Government Forms

The backend supports various Indian government forms including:
- PAN Card Application
- Driving License Application
- Passport Application
- And many more through dynamic form discovery

## Error Handling

The API returns appropriate HTTP status codes and error messages in case of failures. Check the response's `success` field to determine if the request was successful.
