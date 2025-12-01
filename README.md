# Pushups Tracker

A React Native / Expo app for tracking your daily pushups progress. The goal is to track your journey from doing 100 pushups per day (in multiple sets) until you can complete 100 pushups in a single set.

## Features

- **Real-time Workout Tracking**: Start/stop timers for each set, automatic rest tracking
- **Pushup Counter**: Tap to count pushups during your workout
- **Workout History**: View all past workouts with expandable details
- **Progress Charts**: Visualize your improvement over time
- **Goal Tracking**: Track progress toward 100 pushups in one set
- **Cloud Sync**: All data synced via Supabase
- **Google Sign-In**: Secure authentication

## Tech Stack

- **Framework**: React Native with Expo
- **Router**: Expo Router (file-based routing)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth via Supabase Auth
- **State**: Zustand
- **Charts**: react-native-chart-kit

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Supabase account
- Google Cloud Console account (for OAuth)

### 1. Clone and Install

```bash
cd pushups
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Get your project URL and anon key from Settings > API

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Add your Supabase callback URL:
     `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. In Supabase, go to Authentication > Providers > Google
6. Enable Google and add your Client ID and Secret

### 4. Environment Variables

Create a `.env` file (copy from example):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Update App Configuration

In `app.json`, update:
- `expo.android.package`: Your unique package name (e.g., `com.yourname.pushupstracker`)
- `expo.ios.bundleIdentifier`: Same as above
- `expo.extra.eas.projectId`: Your EAS project ID (after running `eas init`)

In `lib/supabase.ts`, ensure your Supabase credentials are correctly set.

## Development

### Run on Android (Expo Go)

```bash
npx expo start
```

Scan the QR code with Expo Go app on your Android device.

### Run on Android Emulator

```bash
npx expo start --android
```

## Building for Production

### 1. Configure EAS

```bash
# Login to Expo
eas login

# Initialize EAS in your project
eas init
```

### 2. Build APK (for testing)

```bash
eas build -p android --profile preview
```

### 3. Build for Play Store

```bash
eas build -p android --profile production
```

This creates an AAB (Android App Bundle) for Play Store submission.

### 4. Submit to Play Store

1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app in Google Play Console
3. Upload the AAB file from EAS build
4. Fill in store listing, content rating, pricing
5. Submit for review

## Project Structure

```
pushups/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── _layout.tsx
│   │   ├── workout.tsx    # Real-time workout tracking
│   │   ├── history.tsx    # Past workouts list
│   │   └── progress.tsx   # Charts & stats
│   └── _layout.tsx        # Root layout with auth
├── components/            # Reusable components
├── constants/
│   └── Colors.ts          # Theme colors
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── database.ts        # Database operations
│   └── store.ts           # Zustand state
├── app.json               # Expo config
├── eas.json               # EAS Build config
└── supabase-schema.sql    # Database schema
```

## Database Schema

The app uses two main tables:

- **workouts**: Stores workout sessions with totals (pushups, time, etc.)
- **sets**: Stores individual sets within each workout

See `supabase-schema.sql` for the complete schema with Row Level Security policies.

## Troubleshooting

### Google Sign-In not working

1. Ensure the redirect URI is correctly configured in Google Cloud Console
2. Check that Google provider is enabled in Supabase Auth settings
3. Verify the scheme in `app.json` matches your auth configuration

### Charts not displaying

Make sure you have at least 2 workout sessions recorded for charts to appear.

### Database errors

1. Verify your Supabase URL and anon key are correct
2. Ensure the database schema has been applied
3. Check Row Level Security policies are in place

## License

MIT

