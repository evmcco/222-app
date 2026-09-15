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

Conference and state metadata comes from Supabase `team_filter_metadata`, selected by season and persisted in AsyncStorage. The dropdown is derived from the metadata (FBS conference groups and states); FCS opponent states also match. Cached data remains usable when the network is unavailable. With no metadata, All games and Ranked work and a retry control is shown. The backend repo owns the verified seed, weekly ESPN import, validation, and deployment instructions in `docs/team-metadata.md`. Deploy its schema/seed before using this app version.

Run filter/grouping checks with `node --test tests/game-filters.test.cjs`.

## Development Demo Mode

In a development build, double tap/click the **222 logo** within 350 ms to open the developer menu. Select **Saturday · 2 PM** for a frozen fictional slate, or focus on Upcoming, In progress, Completed, Overtime, or Delayed. Select **Off · Live data** to return to the real feed.

The selection survives app restarts. **Hide demo label for screenshots** removes the badge; the logo gesture still opens the menu. Release builds always use live data and do not expose the menu.

Fixtures live in `lib/demo-games.ts` and cover quarters, halftime, end of quarter, OT/3OT/final OT, pregame and midgame delays, suspension, rankings, pushes, missing odds, missing period scores, and sample narratives. The snapshot is anchored to September 19, 2026, at 2 PM Eastern, with Friday finals and illustrative early kickoffs. Kickoff labels still use the device timezone. Team logos use the existing ESPN image URLs and require network access on first load.

Demo scores, metadata, narratives, and drawer information are local. Demo pins and filters are session-only and separate from saved live preferences. Demo mode never mounts the live feed or narrative subscriptions.
