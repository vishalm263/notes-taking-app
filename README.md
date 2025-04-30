# NoteTaker - Rich Text Notes Application

A full-featured notes application built with React, Firebase, and TipTap/ProseMirror.

## Features

- Rich text editor with support for headings, code blocks, lists, and more
- User authentication (email and Google sign-in)
- Note organization (sections, tags, pinning, archiving)
- Version history with ability to restore previous versions
- Dark/light mode
- Real-time auto-save
- Responsive design

## Tech Stack

- **Frontend**: React.js with Vite, JavaScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Text Editor**: TipTap/ProseMirror for rich text editing
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **State Management**: React Query for server state, Zustand for client state

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <https://github.com/vishalm263/notes-taking-app.git>
   cd notes-taking-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Set up Firestore database
   - Set up Authentication (Email/Password and Google providers)

4. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/       # React components
│   ├── layout/       # Layout components
│   └── ui/           # UI components (shadcn/ui)
├── contexts/         # React contexts
├── hooks/            # Custom hooks
├── lib/              # Utilities and configuration
├── pages/            # Application pages
├── services/         # API and service functions
└── styles/           # Global styles
```
