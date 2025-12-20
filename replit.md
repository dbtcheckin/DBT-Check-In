# DBT Check-In

## Overview

DBT Check-In is a voice-first mobile application that transforms the daily Dialectical Behavior Therapy (DBT) diary card from a burdensome form into a natural 90-second voice conversation. The app aims to improve therapy compliance by allowing patients to speak naturally about their day, with AI extracting relevant clinical data and asking targeted follow-up questions to complete the diary card.

The core problem being solved is "form fatigue" - traditional DBT diary cards require 5-10 minutes of daily checkbox completion, leading to incomplete data and low compliance. This app reduces that to under 2 minutes through voice input and AI-assisted data extraction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo (SDK 54)
- **Navigation**: React Navigation with native stack navigators and bottom tab navigation
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Animation**: React Native Reanimated for smooth, performant animations
- **Styling**: StyleSheet-based with a centralized theme system following "Quiet Strength" design philosophy (therapeutic, not gamified)

### Directory Structure
- `client/` - React Native frontend code
  - `screens/` - Screen components (Home, Recording, AICompletion, FinalReview, etc.)
  - `components/` - Reusable UI components
  - `navigation/` - Stack and tab navigators
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions and API client
  - `constants/` - Theme, colors, and configuration
- `server/` - Express.js backend
- `shared/` - Shared code between client and server (schema, types)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: RESTful endpoints for CRUD operations on diary entries and users
- **AI Integration**: OpenAI API for voice transcription analysis and follow-up question generation

### Data Model
- **Users**: Basic user profile with display name, avatar preset, notification preferences
- **Diary Entries**: Daily entries containing emotions (0-5 scale), urges (0-5 scale), skills used, behaviors, context (prompting events, vulnerabilities), and voice transcript

### Key Design Decisions
1. **Voice-first approach**: Uses OpenAI Realtime API via WebRTC for live voice-to-voice interaction on web, with real-time transcript display and live diary card updates showing detected emotions/skills
2. **Two-phase completion**: Initial voice recording followed by AI-generated clarifying questions
3. **Dark theme only**: Follows therapeutic "Quiet Strength" design with warm clay/sand accent colors (#c4a67c)
4. **Path aliases**: Uses `@/` for client code and `@shared/` for shared code via babel module-resolver
5. **WebRTC for web only**: Voice recording uses WebRTC with navigator.mediaDevices API - works on web browsers but not in Expo Go mobile app

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via Drizzle ORM
- **Connection**: Requires `DATABASE_URL` environment variable

### AI Services
- **OpenAI Realtime API**: Used for live voice-to-voice interaction via WebRTC, real-time transcription, and DBT diary card data extraction
- **OpenAI Chat API**: Used for generating follow-up questions and completing diary card entries
- **Connection**: Requires `OPENAI_API_KEY` environment variable (gracefully handles missing key)

### WebRTC Integration
- **POST /api/realtime/sdp**: Backend endpoint that forwards SDP offers to OpenAI's Realtime API
- **useWebRTC hook**: Manages peer connections, data channels, and transcript events
- **Audio streaming**: Bidirectional audio via WebRTC tracks for voice input and AI voice responses
- **Data channel**: Receives real-time transcript events (delta and completed) for live UI updates

### Mobile/Expo Services
- **WebRTC**: Voice recording on web platform via navigator.mediaDevices.getUserMedia
- **expo-av**: Audio/video playback (fallback for non-WebRTC scenarios)
- **expo-haptics**: Tactile feedback
- **expo-linear-gradient**: UI gradient effects
- **AsyncStorage**: Local data persistence for user preferences

### Build & Development
- **Drizzle Kit**: Database migrations and schema management
- **tsx**: TypeScript execution for server development
- **esbuild**: Server bundling for production