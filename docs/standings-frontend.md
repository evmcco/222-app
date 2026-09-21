# EVM-10 frontend

The Games and Standings routes share bottom tabs. Standings contains Top 25 (AP,
Coaches, and CFP after its first release) and Conferences. CFP becomes the default
when its first nonempty release arrives; users can subsequently choose another poll.
Both selectors reuse the Games anchored dropdown, with no Cancel item. Conference
labels, grouping, and order come from the same Games metadata. Team rows display
scoreboard abbreviations. The redundant Standings title and release date are removed.
Top 25 rows display rank, weekly trend, logo, team abbreviation, overall record,
and conference abbreviation, in that order. The conference label is slightly
smaller than the record. Unchanged ranks have no movement placeholder.
G6 filter labels use AAC, CUSA, MAC, MWC, PAC-12, and SBC in both tabs, preserving
their existing order. Conference rows show a smaller parenthesized overall record
before the conference record. All row text is vertically centered.
Rows use a 56-point minimum height and tighter spacing;
rank columns grow with the device font scale and numeric text stays on one line.
Each view keeps its own expanded-team set. Multiple
teams can remain open, and opening/closing game details preserves the list.

Expanded schedules use a horizontal strip of opponent logos with W/L below completed
games. Current selected-poll ranks appear on logos; conference strips use AP ranks.
All team-logo surfaces use the shared `TeamLogo` component, including Games cards,
game details, and the period scoreboard. Known ESPN NCAA URLs prefer the matching
`500-dark` asset and fall back to the original URL on load failure. Custom URLs
remain unchanged; no backend migration or per-team API call is needed.
Conference strips require `conference_competition === true`. There is no game-count
limit or separate full-schedule link. Postseason games appear as the backend adds them;
no conference membership or championship classification is inferred locally.

`useCompetitionData` supplies the shared season snapshot. Standings records use
verified records from that snapshot, never the provider standings-entry evidence. Unverified records
show a dash. Conference standings sort by verified conference wins descending,
then conference losses ascending, then full team name A–Z; unknown records follow known records. Displayed positions
follow that order. A footer explains the sorting and that tiebreakers will be added
when they start to matter. The current season is independent of the Games week selection.
Game pins share one persisted preferences provider across the tabs.

Opening the Standings tab checks the backend revision. A skeleton appears only
while the initial snapshot loads. Background refreshes retain rows, verified
records, schedules, and expansions without a loading banner. Pull-to-refresh waits
for the shared request coordinator, including a trailing check if updates arrive
during the request. Failed refreshes retain the snapshot and show a retry notice.
Realtime updates and the existing 30-second revision fallback remain active; a full
snapshot is fetched only when needed. Backend workers own release-window scheduling.

## Backend dependency

The shared contract in `lib/competition-data.ts` and `hooks/games.ts` was implemented
with the backend task. Frontend QA adds awaitable refresh coordination in
`hooks/use-competition-data.ts`. The contract is documented in
`../cfb-covers-supabase/docs/rankings-standings-contract.md`.

The backend task deployed and populated `get_competition_snapshot(p_season)` on
2026-09-20 (local time). Live iPhone verification confirmed AP rankings, conference
records, current-rank badges, and chronological conference schedules with demo off.
The deployment includes 888 games and verified records for all 138 FBS teams.
There is no production fallback to fictional fixtures or incoherent legacy records.
During a staggered rollout, Games uses its existing live scoreboard query and Realtime
subscription only when the new snapshot RPC is missing and no snapshot exists. It
switches wholly to the shared snapshot once available. Standings remains unavailable
until backend deployment; legacy games never supply or synthesize standings records.

## Preview and verification

In a development build, double-tap the 222 logo, choose Saturday · 2 PM, then Done.
Open the Standings bottom tab. Fixtures include 25 ranked teams, two different polls,
four conferences, full 12-game schedules, and unavailable CFP rankings. Demo settings
are shared between both tabs. All schedule IDs are isolated `demo:` IDs and game
details use a local override.

- `npm test` covers schedule scope, chronological postseason additions, results,
  current-rank badges, readiness, conference wins/losses/alphabetical ordering, and coherent fixture records.
- `npx tsc --noEmit` and `npm run lint` validate the app.
- iOS export: `npx expo export --platform ios --output-dir /private/tmp/evm10-ios-export`.
- On a fresh app reload with Saturday demo selected and Games visible, replay
  `argent flow run standings-navigation --device <simulator-udid>`.
  This fragment uses frozen English demo labels and preserves demo mode. Read its
  YAML entry prerequisite, and turn demo off after testing.
- The old `standings-details-filters` flow is retired: it expected the removed
  centered modal, Cancel action, and selectable unavailable CFP poll. A replacement
  recording was not accepted because screen state changed during automation.
- QA follow-up: 75 unit tests, TypeScript, and lint pass. Live simulator inspection
  confirms row layouts, larger-text ranks, the sorting footer, dark logos, and
  anchored poll/conference menus; a full automated
  dropdown and refresh gesture replay remains unverified. Demo mode remains off.
- ESPN exposes others receiving votes for AP and Coaches, but ingestion and display
  of that list are not included in this implementation.

Others Receiving Votes appears below AP/Coaches Top 25 when provided by the release, with team logos, abbreviations, and total poll points in descending order. These teams do not receive rank badges. Older snapshots without the field and empty lists omit the section.
