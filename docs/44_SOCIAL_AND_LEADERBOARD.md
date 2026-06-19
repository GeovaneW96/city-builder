# Social and Leaderboard

## Purpose

This document defines city snapshot sharing and scenario leaderboard features.

These features are social and meta-game only. They do not affect simulation logic.

## City Snapshot

A city snapshot encodes the current game state into a shareable format.

### Export

The game state is serialized to JSON, then compressed:

```txt
stateJSON = JSON.stringify(gameState + metadata)
encoded = LZString.compressToBase64(stateJSON)
// or: encodeURIComponent(btoa(stateJSON)) for simple base64
```

### Snapshot Metadata

```txt
{
  cityName: "My City",
  population: 1234,
  money: 45000,
  happiness: 72,
  rating: "B",
  milestones: ["first_road", "pop_100", "pop_500"],
  playTime: 1820,         // seconds
  date: "2026-06-18",
  mapSize: "64x64",
  gameVersion: "0.4.0"
}
```

### Share URL

```txt
https://game.com/share/{encodedSnapshot}
```

Or a downloadable `.city` file for offline sharing.

### Import

The player can import a snapshot by:

1. Pasted encoded string.
2. Uploaded `.city` file.
3. Shared URL (opens in browser, loads snapshot).

### Import Flow

1. Decode the string.
2. Validate format and version.
3. Show a preview card with metadata (city name, population, money, happiness).
4. Show confirmation dialog: "Importing will replace your current game. Continue?"
5. On confirm, replace game state with snapshot data.

## Scenario Leaderboard

The leaderboard tracks scenario completion performance.

### Leaderboard Entry

```txt
{
  scenarioId: "first_settlement",
  playerName: "Player1",
  completionTime: 14,    // in-game months
  populationAtWin: 1050,
  date: "2026-06-18"
}
```

### Storage

Leaderboard data is stored in localStorage under key `citybuilder_leaderboard`.

```txt
leaderboard: {
  "first_settlement": [
    { playerName, completionTime, populationAtWin, date },
    ...
  ],
  "industrial_boom": [...]
}
```

### Sorting

Entries are sorted by `completionTime` (ascending). Faster completion time ranks higher. If two entries have the same time, `populationAtWin` (higher is better) breaks the tie.

### Recording Rules

- Only records scenario wins (not losses).
- Only records if the scenario has a defined win condition.
- Only records if the player reached the win condition.
- Only records the best (fastest) entry per `playerName` per scenario.

### Display

The leaderboard is shown in the scenario complete screen.

| Rank | Player  | Time (months) | Population | Date       |
| :--: | ------- | ------------: | ---------: | ---------- |
|  1   | Player1 |            14 |      1,050 | 2026-06-18 |
|  2   | Player2 |            18 |      1,100 | 2026-06-17 |
|  3   | Player3 |            22 |      1,020 | 2026-06-16 |

## Privacy

No data is sent to external servers. Everything is local to the player's browser. Leaderboard data is not shared between players.

Snapshot sharing is opt-in: the player must explicitly copy a URL or download a file.

## Tests

- Export produces a valid compressed string.
- Import decodes a valid compressed string back to the original state.
- Import of malformed string shows error and does not change game state.
- Import shows confirmation dialog before replacing game state.
- Cancel on import dialog does not change game state.
- Leaderboard entry is stored in localStorage after scenario win.
- Leaderboard entry is not stored on scenario loss.
- Leaderboard entry is not stored if scenario has no win condition.
- Entries are sorted by completion time ascending.
- Tie-breaking by population (higher wins) works correctly.
- Only the best entry per player per scenario is stored.
- Leaderboard data persists across page reloads.
- Empty leaderboard shows no entries (not an error).
- Snapshot metadata contains all required fields.
- Snapshot version mismatch shows a compatibility warning.
