# Factorial Clock-In (TypeScript)

Automated web navigation and form filling using Puppeteer and TypeScript. Includes multi-step login with 2FA support and automated attendance calendar filling.

## Setup

```bash
npm install
npm run build
```

## Quick Start

### Simplest way: properties file + `npm start`

```bash
cp config.properties.example config.properties
# fill in EMAIL, PASSWORD and URL in config.properties
npm start
```

`YEAR` and `MONTH` are optional: if you leave them empty (or remove them), the current year and month are used.

### Complete Workflow: Login + Fill Attendance Calendar

```bash
EMAIL=user@example.com PASSWORD=mypassword URL=https://example.com YEAR=2026 MONTH=7 npm run dev
```

The app will:
1. ✅ Login with email
2. ✅ Login with password
3. ✅ Handle 2FA if required
4. ✅ Navigate to clock-in page
5. ✅ Fill attendance calendar for the month

### Environment Variables

```bash
EMAIL=user@example.com       # Email (required)
PASSWORD=mypassword          # Password (required)
URL=https://example.com      # Website URL (required)
YEAR=2026                    # Year for attendance (default: current year)
MONTH=7                      # Month for attendance (default: current month)
HEADLESS=true                # Run headless (default: false)
KEEP_OPEN=true               # Don't close browser (default: false)
```

### Local properties file

You can keep your credentials and settings in a local `config.properties` file at the project root. The app will read it automatically when present.

```properties
EMAIL=user@example.com
PASSWORD=your-password
URL=https://example.com
YEAR=2026
MONTH=7
HEADLESS=false
KEEP_OPEN=false
```

Copy `config.properties.example` to `config.properties` and adjust the values locally.

CLI args and environment variables still override the file values.

## Features

✅ **Multi-step Login**
- Email entry
- Password entry
- 2FA detection with interactive code entry
- Navigate to clock-in link

✅ **Attendance Calendar Automation**
- Automatically fills entire month calendar
- Monday-Thursday: 2 entries (8 AM-2 PM, 2:30 PM-5 PM)
- Friday: 1 entry (8 AM-3 PM)
- Skips weekends automatically
- Values auto-save (no manual submit needed)

✅ **TypeScript Support** - Full type safety
✅ **Error Handling** - Comprehensive error messages

## Attendance Calendar Filling

The `fillAttendanceCalendar` workflow automates the entire attendance month:

### Schedule
- **Monday-Thursday:** 2 time entries
  - 08:00 - 14:00 (8 AM to 2 PM)
  - 14:30 - 17:00 (2:30 PM to 5 PM)
  
- **Friday:** 1 time entry
  - 08:00 - 15:00 (8 AM to 3 PM)
  
- **Saturday-Sunday:** Skipped (weekends)

### How It Works

1. For each day in the month:
   - Checks if it's a weekday
   - Expands the day section
   - Clicks the "add" button for each time entry
   - Fills start and end times
   - Values auto-save automatically

2. Progress is logged with emojis:
   - 📅 Calendar operations
   - 📂 Expanding days
   - ⏰ Adding time entries
   - ✅ Completed entries
   - ⏭️  Skipped days (weekends)

## Usage Examples

### Full Automation for July 2026

```bash
EMAIL=user@example.com PASSWORD=pass123 URL=https://example.com YEAR=2026 MONTH=7 npm run dev
```

### Fill Different Month

```bash
EMAIL=user@example.com PASSWORD=pass123 URL=https://example.com YEAR=2026 MONTH=8 npm run dev
```

### Keep Browser Open for Inspection

```bash
EMAIL=user@example.com PASSWORD=pass123 URL=https://example.com YEAR=2026 MONTH=7 KEEP_OPEN=true npm run dev
```

### Run Headless (CI/CD)

```bash
EMAIL=user@example.com PASSWORD=pass123 URL=https://example.com YEAR=2026 MONTH=7 HEADLESS=true npm run dev
```

## Project Structure

```
factorial-clock-in/
├── src/
│   ├── index.ts              # Main entry point (login + calendar filling)
│   ├── workflows.ts          # WebAutomation class + all workflows
│   └── examples.ts           # Example workflows
├── dist/                     # Compiled JavaScript
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## WebAutomation Class Methods

```typescript
// Launch browser
await auto.launch();

// Navigate to URL
await auto.navigate('https://example.com');

// Fill an input field
await auto.fillField('input[aria-label="Email"]', 'user@example.com', 'Email Label');

// Click a button
await auto.clickButton('button[type="submit"]', 'Submit Button');

// Submit form (press Enter or submit specific form)
await auto.submitForm();

// Wait for page navigation
await auto.waitForNavigation();

// Wait for specific selector
await auto.waitForSelector('h1.success');

// Check if element exists
const exists = await auto.elementExists('input[aria-label="Email"]');

// Check if page contains text
const hasText = await auto.pageContainsText('Welcome');

// Extract text content
const text = await auto.extractData('h1');

// Get user input (interactive)
const code = await auto.getUserInput('Enter code: ');

// Take screenshot
await auto.screenshot('result.png');

// Close browser
await auto.close();

// Wait/delay
await auto.delay(2000);

// Run complete workflow
await auto.run(steps);
```

## Workflows

### multiStepLogin

Implements a 4-step login process:
1. Email field fill + submit
2. Password field fill + submit
3. 2FA detection and handling (prompts for 6-digit code if needed)
4. Navigate to clock-in link

### fillAttendanceCalendar

Fills the entire month's attendance calendar:
- Takes year and month as parameters
- Expands each day
- Adds time entries based on day of week
- Auto-saves values

## Tips & Tricks

1. **Debug Mode:** Use `KEEP_OPEN=true` to inspect the browser after script runs
2. **Screenshots:** Use `auto.screenshot()` to debug visual issues
3. **Console Logs:** Emoji feedback (📅⏰✅❌⏭️) for each action
4. **Custom Delays:** Use `await auto.delay(ms)` between actions if needed
5. **Selector Inspection:** Use browser DevTools (F12) to find the correct selectors

## Troubleshooting

### Element Not Found

**Problem:** `Error: Timed out after waiting for selector`

**Solution:**
1. Verify the CSS selector is correct
2. Increase timeout in WebAutomation config
3. Check if the element is visible/loaded
4. Use browser DevTools to inspect elements

### Day Buttons Not Working

**Problem:** Days not expanding or add buttons not found

**Solution:**
1. Check the actual selectors in the attendance page
2. Update the selectors in `fillAttendanceCalendar` workflow
3. Use `KEEP_OPEN=true` to inspect the page structure
4. Take screenshots to verify form structure

### Time Fields Not Filling

**Problem:** Time entries not being saved

**Solution:**
1. Verify time field selectors (look for type="time")
2. Check if fields require specific time format
3. Ensure sufficient delay between filling start and end time
4. Verify the fields have focus before typing

## Build & Deploy

### Production Build

```bash
npm run build
```

Then run:

```bash
EMAIL=user@example.com PASSWORD=pass URL=https://example.com YEAR=2026 MONTH=7 node dist/index.js
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Fill Attendance
  env:
    EMAIL: ${{ secrets.AUTOMATION_EMAIL }}
    PASSWORD: ${{ secrets.AUTOMATION_PASSWORD }}
    URL: https://example.com
    YEAR: 2026
    MONTH: 7
    HEADLESS: true
  run: |
    npm install
    npm run build
    node dist/index.js
```

## Notes

- Time entries are automatically saved (no manual submit needed)
- Weekends are automatically skipped
- 2FA code entry is interactive (user is prompted)
- Browser remains visible during execution (set `HEADLESS=true` to hide)
