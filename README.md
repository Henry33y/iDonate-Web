# iDonate Admin Dashboard

A web application for managing blood donation requests and connecting donors with healthcare institutions.

## Features

- Modern, responsive landing page
- Institution dashboard for blood request management
- Firebase authentication (Google sign-in + email/password)
- Real-time blood request tracking
- Profile management for institutions

## Tech Stack

- React.js
- Firebase (Authentication, Firestore)
- TailwindCSS
- React Router
- React Toastify

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/idonate-admin.git
   cd idonate-admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project and get your configuration:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Get your Firebase configuration

4. Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  ├── components/         # Reusable UI components
  ├── contexts/          # React contexts (Auth, etc.)
  ├── pages/            # Page components
  ├── firebase.js       # Firebase configuration
  └── App.jsx           # Main application component
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
