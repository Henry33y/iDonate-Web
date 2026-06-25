
# iDonate Admin Dashboard

A web application for managing blood donation requests, verifying healthcare institutions, and coordinating the iDonate blood donation platform.

## Features

- **Landing Page**: Modern, responsive landing page with platform overview
- **Institution Registration**: Healthcare institutions can sign up and upload license documents
- **Institution Verification**: Admin review and approval of institutions
- **Blood Request Management**: Institutions can create and manage blood requests
- **Admin Dashboard**: System admins can manage users, institutions, and requests
- **Realtime Updates**: Live notifications for new requests and messages
- **Location Picker**: Interactive map for selecting institution locations
- **Cookie Consent**: GDPR-compliant cookie management
- **Privacy Policy & Terms of Service**: Complete legal documentation

## Tech Stack

- **React 18.2.0**: UI framework
- **Vite 5**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **React Router DOM 6**: Client-side routing
- **React Hook Form**: Form management
- **Yup**: Form validation
- **Leaflet**: Interactive maps
- **Supabase**: Backend (Auth, Database, Realtime, Storage, Edge Functions)

## Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project

## Setup Instructions

1. **Clone the repository and navigate to the web directory**:
   ```bash
   cd iDonate-Web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Create a `.env` file in the root directory
   - Fill in your Supabase project URL and anon key:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run all database migrations from the `../supabase/` directory
   - Enable PostGIS extension
   - Set up a Storage bucket for institution documents and profile pictures
   - Deploy Edge Functions from the `supabase/functions/` directory

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

## Project Structure

```
iDonate-Web/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── AdminProtectedRoute.jsx
│   │   ├── AppointmentMessages.jsx
│   │   ├── DocumentUploader.js
│   │   ├── LocationPicker.jsx
│   │   ├── Navbar.jsx
│   │   ├── PrivateRoute.jsx
│   │   └── ...
│   ├── contexts/          # React contexts (Auth, etc.)
│   ├── pages/            # Page components
│   │   ├── AdminDashboard.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Home.jsx
│   │   ├── InstitutionLogin.jsx
│   │   ├── InstitutionRegistration.jsx
│   │   ├── PrivacyPolicy.jsx
│   │   ├── TermsOfService.jsx
│   │   └── ...
│   ├── services/         # API services (supabaseService.js, etc.)
│   ├── config/           # Supabase configuration
│   ├── assets/           # Images and media
│   ├── App.jsx           # Main application component
│   ├── App.css
│   └── main.jsx          # Application entry point
├── supabase/
│   └── functions/        # Supabase Edge Functions
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Available Scripts

- `npm run dev`: Start the Vite development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint

## User Roles

1. **Guest**: Can view landing page and sign up
2. **Institution**: Can create blood requests, manage their profile, and communicate with donors
3. **Admin**: Can verify institutions, manage all users, view system metrics, and moderate content

## Key Features Breakdown

### Institution Verification Flow
1. Institution signs up and uploads license document
2. Admin reviews pending institutions in Admin Dashboard
3. Admin can approve, reject, or suspend institutions
4. Only verified institutions can create blood requests

### Location Picker
- Three modes: GPS detection, manual map selection, Nominatim search
- Supports both latitude/longitude and address inputs
- Validates location data before submission

### Messaging System
- Institutions can communicate with donors about scheduled appointments
- Realtime message delivery via Supabase Realtime
- In-app notifications for new messages

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the iDonate blood donation platform.

