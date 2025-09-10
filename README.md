# Scrim Scheduler

A Next.js application for scheduling scrims (practice matches) with automatic Google Sheets integration.

## Features

- Single-page form for inputting scrim details
- Google Sheets API integration with Service Account authentication
- Form validation with zod
- Modern UI with shadcn/ui components
- TypeScript support
- Responsive design

## Form Fields

1. **Tanggal Scrim** - Date picker (required)
2. **Lawan** - Text input for opponent name (required, min 2 characters)
3. **Map** - Text input for map name (required, min 2 characters)  
4. **Start Match** - Time picker in HH:mm format (required)
5. **Fraksi** - Dropdown to select "Fraksi 1" or "Fraksi 2" (required)

## Google Sheets Integration

- Data is automatically appended to the appropriate sheet tab based on the selected Fraksi
- Sheet tabs must be named exactly "Fraksi 1" and "Fraksi 2"
- Column headers in row 1 should be: `Tanggal Scrim | Lawan | Map | Start Match`

## Setup Instructions

### 1. Google Sheets Setup

1. Create a new Google Spreadsheet
2. Create two tabs named exactly "Fraksi 1" and "Fraksi 2"
3. In row 1 of each tab, add these headers:
   - A1: `Tanggal Scrim`
   - B1: `Lawan`
   - C1: `Map`
   - D1: `Start Match`

### 2. Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Fill in details and create
   - Create a JSON key for the service account
5. Share your Google Spreadsheet with the service account email (found in the JSON file) as Editor

### 3. Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in the required environment variables:

\`\`\`bash
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\nYour private key content here\n-----END PRIVATE KEY-----\n"
\`\`\`

**Note:** For the private key, ensure all newlines are escaped as `\\n` in the .env file.

### 4. Installation & Development

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
src/
├── app/
│   ├── api/sheets/append/route.ts  # API endpoint for Google Sheets
│   ├── layout.tsx                  # Root layout with Toaster
│   ├── page.tsx                    # Main form page
│   └── globals.css                 # Global styles with shadcn/ui variables
├── components/
│   ├── ui/                         # shadcn/ui components
│   └── form-fields.tsx             # Custom form field components
└── lib/
    ├── google-sheets.ts            # Google Sheets API helper
    ├── utils.ts                    # Utility functions
    └── validation.ts               # Zod validation schema
\`\`\`

## Technology Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **react-hook-form** for form handling
- **zod** for validation
- **googleapis** for Google Sheets integration
- **sonner** for toast notifications

## API Endpoints

- `POST /api/sheets/append` - Appends form data to appropriate Google Sheets tab

## Usage

1. Fill out all required form fields
2. Select the appropriate Fraksi (team)
3. Click Submit
4. Data will be automatically added to the corresponding Google Sheets tab
5. Success/error notifications will be displayed

## Troubleshooting

- **Build errors**: Ensure all dependencies are installed
- **Google Sheets connection issues**: Verify service account permissions and environment variables
- **Form validation errors**: Check that all required fields are filled correctly
- **Time format**: Use HH:mm format (e.g., 14:30 for 2:30 PM)