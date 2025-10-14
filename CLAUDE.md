# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native/Expo project called "cfb-covers" - a college football betting app that tracks game covers and betting predictions. The project uses:

- **Expo SDK 54** with the new architecture enabled
- **React 19** and **React Native 0.81.4**
- **Expo Router** for file-based navigation with typed routes
- **TypeScript** with strict mode enabled
- **React Native Reanimated** for animations
- **Expo Symbols** for SF Symbols icons

## Common Development Commands

### Starting the Development Server
```bash
npx expo start          # Start development server
npm run android         # Open on Android emulator
npm run ios             # Open on iOS simulator  
npm run web             # Open in web browser
```

### Code Quality
```bash
npm run lint            # Run ESLint (expo lint)
```

### Project Reset
```bash
npm run reset-project   # Move starter code to app-example/ and create blank app/
```

## Architecture and File Structure

### App Structure (Expo Router)
- `app/` - Main application directory using file-based routing
  - `_layout.tsx` - Root layout with theme provider and stack navigation
  - `(tabs)/` - Tab-based navigation group
    - `_layout.tsx` - Tab layout configuration
    - `index.tsx` - Home tab
    - `explore.tsx` - Explore tab
  - `modal.tsx` - Modal screen

### Components
- `components/` - Reusable UI components
  - `game-card.tsx` - Main game display component (appears to be the core feature)
  - `themed-*.tsx` - Theme-aware UI components
  - `ui/` - Low-level UI primitives (icons, collapsibles)
  - `haptic-tab.tsx` - Tab component with haptic feedback

### Configuration
- `constants/theme.ts` - Light/dark theme configuration with platform-specific fonts
- `hooks/` - Custom React hooks for theme and color scheme management
- TypeScript path alias `@/*` maps to project root

### Key Features
- **Automatic light/dark theme switching** using `useColorScheme` hook
- **Haptic feedback** on tab interactions
- **SF Symbols integration** via expo-symbols
- **Cross-platform support** (iOS, Android, Web)
- **New React Native architecture** enabled for better performance

## Development Notes

- The project uses strict TypeScript configuration
- ESLint is configured with Expo's flat config
- The app supports both light and dark themes with automatic detection
- File-based routing with typed routes is enabled for better developer experience
- React Compiler experimental feature is enabled for potential performance improvements