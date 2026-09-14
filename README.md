# 222 Sports - College Football Tracker

A React Native portfolio app demonstrating real-time data management, push notifications, and modern mobile development patterns.

## Key Features

- **Real-time Score Updates** with WebSocket subscriptions and animated UI changes
- **Push Notifications** with game-specific alerts and local preference management  
- **Betting Analytics** showing spread coverage and over/under tracking
- **Offline-First Architecture** using TanStack React Query for intelligent caching
- **Smooth Animations** with React Native Reanimated for scoreboard-style updates

## Tech Stack

**Frontend**: React Native 0.81.4, TypeScript, Expo SDK 54  
**State Management**: TanStack React Query, AsyncStorage  
**Backend**: Supabase (PostgreSQL + real-time subscriptions)  
**Animations**: React Native Reanimated  
**Navigation**: Expo Router with file-based routing  
**Notifications**: Expo Notifications, Expo Haptics

## Technical Highlights

### Real-time Data Management
- Supabase WebSocket subscriptions with auto-reconnection and exponential backoff
- TanStack React Query for intelligent caching and background sync
- Optimistic UI updates with rollback on failure

### Push Notification Architecture  
- Cross-platform push notifications with Expo
- Local preference storage using AsyncStorage
- Database-backed notification subscriptions

### Performance Optimizations
- React Native's new architecture enabled
- Efficient real-time filtering (live games only)
- Animated score changes with React Native Reanimated

## Getting Started

```bash
npm install
npm start          # Start development server
npm run ios        # iOS simulator  
npm run android    # Android emulator
```

## Portfolio Notes

This app demonstrates several React Native best practices:

- **Modern State Management**: TanStack Query for server state, AsyncStorage for local preferences
- **Real-time Features**: WebSocket integration with robust error handling and reconnection logic  
- **Cross-platform Notifications**: Expo's unified push notification API with proper permission handling
- **Performance**: New RN architecture, React Compiler, and efficient real-time data filtering
- **Developer Experience**: TypeScript, file-based routing, comprehensive error handling

*Built as a portfolio project showcasing modern React Native development patterns*
### Game filters and pins

The header dropdown applies one filter to the selected week. Pins stay in a separate section, ordered by kickoff; filtered-out pins remain saved. Both preferences are stored on the device with AsyncStorage (`222:game-preferences:v1`).

The bundled 2026 team catalog supplies conference membership and home state without runtime team requests. It includes FCS opponent states; only states with FBS schools appear in the dropdown. Before a new season, run `node scripts/update-team-catalog.mjs YEAR` and update the catalog import in `lib/game-filters.ts`. The generator reads ESPN's season-specific FBS groups and team home-venue addresses (not individual game venues). Review membership and location changes before shipping the refreshed catalog.

Run filter/grouping checks with `node --test tests/game-filters.test.cjs`.
