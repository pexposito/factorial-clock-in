# Attendance Calendar Automation Workflow

## Overview

The `fillAttendanceCalendar` workflow fills a month's attendance in Factorial's monthly time-tracking view (`https://app.factorialhr.com/attendance/clock-in/monthly/<year>/<month>/1`) with time entries based on day-of-week rules.

## Implementation Details

### Time Schedule

| Day | Time Entry 1 | Time Entry 2 | Notes |
|-----|------|------|-------|
| Monday | 08:15 - 14:00 | 14:30 - 17:00 | 2 entries |
| Tuesday | 08:15 - 14:00 | 14:30 - 17:00 | 2 entries |
| Wednesday | 08:15 - 14:00 | 14:30 - 17:00 | 2 entries |
| Thursday | 08:15 - 14:00 | 14:30 - 17:00 | 2 entries |
| Friday | 08:00 - 15:00 | - | 1 entry |
| Saturday | - | - | Skipped |
| Sunday | - | - | Skipped |

### How It Works

The workflow first navigates to the monthly view of the requested month. Then, for each day of the month:

1. **Day validation**
   - Skips weekends (Saturday-Sunday)
   - Skips days where the row shows `0h 00m` expected hours (leave, holidays)

2. **Day expansion**
   - Finds the day's row in the table (by its "19 Oct" text) and clicks its chevron (last button of the row)
   - Skips the day if the chevron is disabled (future days can't be expanded)

3. **Existing values check**
   - If the expanded day already lists a time range, it is skipped, so re-running is safe

4. **Time entry addition**, for each entry:
   - Clicks the "Add" button of the expanded day
   - Types the start and end time into the popover
   - Clicks "Apply" to save and waits for the popover to close

5. **Progress tracking**
   - Logs each action with emoji indicators
   - Reports skipped and completed days

## Page Structure and Selectors

Class names on the page are hashed and change between deploys, so the code does not use them. It relies on structure, text and stable attributes:

| Element | How it is located |
|---------|-------------------|
| Day row | `tbody tr` whose text starts with `<day> <Mon>` (e.g. `19 Oct`) |
| Expand button | Last `button` of the day row (disabled for future days) |
| Day detail panel | The `tr` right after the day row (nested table) |
| Add button | `[data-intercom-target="attendance-row-add-shift-button"]` inside the detail panel |
| Time popover | `[role="dialog"]`, rendered in a portal outside the table |
| Time inputs | `[role="dialog"] input[placeholder="--:--"]` (first = start, second = end) |
| Apply button | `button` with text `Apply` inside the dialog; disabled until both times are valid |

Notes:
- The time inputs are `aria-hidden` text inputs, so they are focused and typed into (digits only, e.g. `0815`); the mask adds the `:`. Clicking them hangs Puppeteer.
- The "Add" button is wrapped in a Radix trigger button, so the `data-intercom-target` element is clicked, not the outer button.

## Usage

### Run Complete Workflow (Login + Attendance)

```bash
# Visible browser (default)
npm start

# Headless
HEADLESS=true npm start

# Specific month
YEAR=2026 MONTH=10 npm start
```

`npm start` builds and runs; `npm run dev` runs the existing build.

### Parameters

Taken from CLI args, environment variables, or `config.properties` (in that order of precedence; see `config.properties.example`):

- `EMAIL` - User email address
- `PASSWORD` - User password
- `URL` - Website URL (main login page)
- `YEAR` - Year for calendar (default: current year)
- `MONTH` - Month number 1-12 (default: current month)
- `HEADLESS` - Run without a visible browser (default: `false`)
- `KEEP_OPEN` - Keep the browser open after finishing (default: `false`)

The Chrome profile is persisted in `.chrome-profile/`, so after the first login the session is reused.

### Output Example

```
📅 Starting to fill attendance calendar for 10/2026
📅 Found 31 days in the month
📍 Navigating to https://app.factorialhr.com/attendance/clock-in/monthly/2026/10/1...
✅ Page loaded

📌 Processing day 1 (Thursday)
⏭️  Day 1 expects 0h (leave/holiday), skipping

📌 Processing day 5 (Monday)
📂 Opening day 5...
⏰ Adding entry 1: 08:15 - 14:00
✅ Entry 1 saved for day 5
⏰ Adding entry 2: 14:30 - 17:00
✅ Entry 2 saved for day 5
✅ Day 5 completed

📌 Processing day 6 (Tuesday)
📂 Opening day 6...
⏭️  Day 6 already has values, skipping

⏭️  Day 10 (Saturday) - Weekend, skipping
...
📌 Processing day 21 (Wednesday)
⏭️  Day 21 cannot be expanded (future day), skipping

✅ Calendar filling completed
```

## Customization

### Modify Time Schedule

Edit `getTimeEntriesForDay()` in `src/workflows.ts`:

```typescript
function getTimeEntriesForDay(dayOfWeek: number): TimeEntry[] {
  if (dayOfWeek === 5) {
    return [{ startTime: '08:00', endTime: '15:00' }];
  } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    return [
      { startTime: '08:15', endTime: '14:00' },
      { startTime: '14:30', endTime: '17:00' },
    ];
  }
  return [];
}
```

### Adjust Delays

If the page is slow, increase the delay between actions in `src/index.ts`:

```typescript
const automation = new WebAutomation({
  delayBetweenActions: 500, // default 300ms
});
```

## Troubleshooting

### Nothing gets filled / "Add button not found"

- Factorial may have changed its markup. Run with `KEEP_OPEN=true`, expand a day manually and compare against the table in "Page Structure and Selectors".
- The selectors live in `WebAutomation` (`expandDay`, `addTimeEntry`, `dayHasExistingAttendanceValues`) in `src/workflows.ts`.

### "Page not found" after login

- The monthly URL must include year, month and a trailing `/1`: `/attendance/clock-in/monthly/<year>/<month>/1`.

### A day is skipped unexpectedly

- Future days can't be expanded, so only days up to today are filled.
- Days with `0h 00m` expected (leave, holidays) and days that already have a time range are skipped on purpose.

### Time entries not saving

- "Apply" stays disabled until both times are valid (`HH:MM`). Check the start is before the end.
- Increase `delayBetweenActions` if the popover closes before the entry is registered.

## Future Enhancements

- [ ] Configurable work schedules
- [ ] Batch import from CSV
- [ ] Support for multiple months
- [ ] Lunch break configuration
- [ ] Project/task assignment
