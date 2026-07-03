

# Hexfire Royal Spin

A spin wheel game application with real-time leaderboard, user profiles, and event management.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Mobile:** Capacitor (Android)
- **Animations:** GSAP
- **UI:** Custom components with Lucide React icons

## Run Locally

**Prerequisites:** Node.js, Supabase Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL scripts in your Supabase SQL Editor in the following order:
     1. `supabase-schema.sql` (Creates base tables, indexes, and triggers)
     2. `server_time_utils.sql` (Server-side time and reset validation logic)
     3. `fix_bot_photos.sql` (Bot profile photo schema and update function)
     4. `fix_missing_rpcs.sql` (Unified RPC fixes for locks, rankings, and bot stats)
   - Enable Google OAuth and Email/Password login in Supabase Auth settings
   - Create a storage bucket named `profile-photos` with public access (in storage dashboard)

3. Set environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

## Database Schema

The application uses the following tables:

- `users` - User profiles and game data
- `weekly_leaderboard` - Weekly leaderboard entries
- `mailbox` - User messages and rewards
- `bot_users` - Smart bot users for leaderboard
- `sunday_lottery_participants` - Lottery event participants
- `events` - Game events and configurations
- `counters` - Auto-increment counters
- `system` - System configuration
- `game_status` - Game maintenance status
- `friend_requests` - Friend request records
- `friends` - Friend relationships

## Features

- **Authentication:** Google OAuth and Email/Password login
- **Spin Wheel:** Interactive spin wheel with prizes
- **Leaderboard:** Real-time weekly leaderboard with friend system
- **Profile:** User profiles with photo upload
- **Events:** Special events like KTM Rush, iPhone Giveaway, Sunday Lottery
- **Mailbox:** Reward messages and notifications
- **Admin Dashboard:** Admin controls for maintenance mode, events, and bot management
- **Real-time Updates:** Live updates using Supabase Realtime

## Project Structure

```
├── components/          # React components
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   └── pages/          # Page components
├── services/           # Supabase service functions
├── hooks/              # Custom React hooks
├── public/             # Static assets
├── plans/              # Migration plans and documentation
└── supabase-schema.sql # Database schema
```

## Migration from Firebase

This project has been migrated from Firebase to Supabase. See the `plans/` directory for detailed migration documentation.

## Build for Android

```bash
npm run build
npx cap sync android
npx cap open android
```
