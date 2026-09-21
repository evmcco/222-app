# Sorting regression checks (EVM-30)

Run automated checks with `npm test`. The sorting tests use fixed dates and cover
all seven priorities, kickoff ordering for pins, live time remaining, overtime,
halftime, delayed/resumed/final transitions, completion timestamps, missing data,
filters, stable ties, arbitrary input order, local midnight, and DST. Both demo
scenarios assert the complete expected list in five timezones.

## Open the demo

In a development build, double-tap the **222 logo**, select a sorting scenario,
then tap **Done**. The developer menu includes the expected behavior for the
selected scenario. Tap the demo label or double-tap the logo to return.

These are fictional, frozen fixtures. Their sorting date is fixed, so tests work
on any real date. Sorting scenarios use the device's local timezone. Pins and
filters in demo mode are separate from live preferences. Switch to another
scenario and back to reset the fixture pins and filter. Select **Off · Live data**
to return to live games.

## Sorting · Saturday

Frozen Saturday, September 19, 2026 at 6 PM local time. With the All games filter,
expect this order:

1. Pinned Georgia–Georgia Tech, then Iowa–Wisconsin (Sunday kickoff).
2. Live Notre Dame–Purdue (3OT), Texas–Texas A&M (1OT), LSU–USC (Q4),
   Ohio State–Michigan (halftime), Tennessee–Oklahoma (end Q1), Penn State–Auburn (Q1).
3. Delayed Oregon–Washington, then SMU–TCU.
4. Completed Utah–BYU, then Kansas State–Kansas. Utah finished more recently,
   even though Kansas State kicked off later.
5. Saturday's upcoming Clemson–Miami.
6. Sunday's upcoming Duke–North Carolina.
7. Thursday's completed Louisville–Pittsburgh, then Friday's Florida State–Florida.

Open Georgia–Georgia Tech and unpin it: it should move between LSU–USC and
Ohio State–Michigan. Unpin Iowa–Wisconsin: it should move between Clemson–Miami
and Duke–North Carolina. Pin an older final: it should move into the pinned
section according to kickoff, appearing exactly once.

Try the Florida filter: hidden pins should disappear, and the remaining games
should retain their relative order. Return to All games to restore them.

## Sorting · after midnight

Frozen Sunday, September 20 at 12:15 AM local time. Saturday's live games remain
above Sunday games. The midgame delay remains in the delayed group, followed by
Sunday's pregame delay. Upcoming games follow, then finished games in Thursday,
Friday, Saturday kickoff order. Saturday's Utah–BYU and Kansas State–Kansas
finals now belong at the bottom. The two pins retain their kickoff order.

Date headers may repeat when necessary to preserve priority; every game should
appear once. This scenario is a fixed snapshot, not an animated clock simulation.
