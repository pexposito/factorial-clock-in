import * as path from 'node:path';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as readline from 'readline';

interface WebAutomationConfig {
  headless?: boolean;
  timeout?: number;
  delayBetweenActions?: number;
  autoCloseBrowser?: boolean;
}

interface WorkflowStep {
  (auto: WebAutomation): Promise<void>;
}

interface TimeEntry {
  startTime: string;
  endTime: string;
}

export class WebAutomation {
  private config: Required<WebAutomationConfig>;
  private browser: Browser | null = null;
  public page: Page | null = null;

  constructor(config: WebAutomationConfig = {}) {
    this.config = {
      headless: config.headless !== undefined ? config.headless : false,
      timeout: config.timeout || 60000,
      delayBetweenActions: config.delayBetweenActions || 300,
      autoCloseBrowser: config.autoCloseBrowser !== undefined ? config.autoCloseBrowser : true,
    };
  }

  async launch(): Promise<void> {
    console.log('🚀 Starting browser...');

    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,sitePerProcess',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-popup-blocking',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--lang=en-US,en',
    ];

    const profileDir = path.join(process.cwd(), '.chrome-profile');
    browserArgs.push(`--user-data-dir=${profileDir}`);

    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      defaultViewport: null,
      args: browserArgs,
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });
    await this.page.evaluateOnNewDocument(() => {
      const navigatorProto = Object.getPrototypeOf(navigator);
      Object.defineProperty(navigatorProto, 'webdriver', {
        get() {
          return undefined;
        },
        configurable: true,
      });
    });
    await this.page.setViewport({ width: 1440, height: 1200 });
    this.page.setDefaultTimeout(this.config.timeout);
    console.log('✅ Browser started');
  }

  async navigate(url: string): Promise<void> {
    console.log(`📍 Navigating to ${url}...`);
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded');
  }

  async fillField(selector: string, value: string, label: string = 'field'): Promise<void> {
    try {
      console.log(`📝 Filling ${label} with: ${value}`);
      if (!this.page) throw new Error('Page not initialized');
      await this.page.waitForSelector(selector, { timeout: this.config.timeout });
      await this.page.click(selector);
      await this.page.evaluate((sel: string, text: string) => {
        const input = document.querySelector(sel) as HTMLInputElement | null;
        if (!input) return;

        input.focus();
        input.select();
        input.setRangeText('');

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, text);
        } else {
          input.value = text;
        }

        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, composed: true, key: 'Enter' }));
      }, selector, value);
      await this.delay(this.config.delayBetweenActions);
      console.log(`✅ ${label} filled`);
    } catch (error) {
      console.error(`❌ Error filling ${label}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async fillEmailField(value: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate((text: string) => {
      const candidates = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
      const emailInput = candidates.find(input => {
        const type = (input.type || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        return type === 'email' || name.includes('email') || ariaLabel.includes('correo') || ariaLabel.includes('email') || placeholder.includes('correo') || placeholder.includes('email');
      }) || candidates.find(input => input.type !== 'password' && input.type !== 'hidden' && !input.disabled);

      if (!emailInput) return false;

      emailInput.focus();
      emailInput.select();
      emailInput.setRangeText('');

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(emailInput, text);
      } else {
        emailInput.value = text;
      }

      emailInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      return true;
    }, value);
  }

  async fillPasswordField(value: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.evaluate((text: string) => {
      const candidates = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
      const passwordInput = candidates.find(input => {
        const isPassword = input.type === 'password';
        const hasExpectedLabel = (input.getAttribute('aria-label') || '').toLowerCase().includes('contraseña') ||
          (input.getAttribute('aria-label') || '').toLowerCase().includes('password');
        return isPassword && (hasExpectedLabel || candidates.length === 1);
      });

      if (!passwordInput) return false;

      passwordInput.focus();
      passwordInput.select();
      passwordInput.setRangeText('');

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(passwordInput, text);
      } else {
        passwordInput.value = text;
      }

      passwordInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      passwordInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }));
      passwordInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, composed: true, key: 'Enter' }));
      return true;
    }, value);
  }

  async clickButton(selector: string, label: string = 'button'): Promise<void> {
    try {
      console.log(`🖱️  Clicking ${label}...`);
      if (!this.page) throw new Error('Page not initialized');
      await this.page.waitForSelector(selector, { timeout: this.config.timeout });
      await this.page.click(selector);
      await this.delay(this.config.delayBetweenActions);
      console.log(`✅ ${label} clicked`);
    } catch (error) {
      console.error(`❌ Error clicking ${label}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async submitForm(formSelector?: string): Promise<void> {
    try {
      console.log('📋 Submitting form...');
      if (!this.page) throw new Error('Page not initialized');

      if (formSelector) {
        await this.page.evaluate((selector: string) => {
          const form = document.querySelector(selector) as HTMLFormElement;
          if (form) form.submit();
        }, formSelector);
      } else {
        await this.page.keyboard.press('Enter');
      }

      await this.delay(this.config.delayBetweenActions);
      console.log('✅ Form submitted');
    } catch (error) {
      console.error('❌ Error submitting form:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async waitForNavigation(): Promise<void> {
    console.log('⏳ Waiting for navigation...');
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Navigation complete');
  }

  async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector(selector, { timeout: timeout || this.config.timeout });
  }

  async extractData(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    return await this.page.$eval(selector, (el: Element) => el.textContent || '');
  }

  async elementExists(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    const element = await this.page.$(selector);
    return element !== null;
  }

  async pageContainsText(text: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    const content = await this.page.content();
    return content.includes(text);
  }

  // The monthly view is a table: one <tr> per day ("19 Oct" / "Monday"), followed by a
  // detail <tr> (nested table + "Add" button) once the day is expanded. Class names are
  // hashed, so rows are located by their text and the buttons by position / data-intercom-target.
  private static readonly DAY_ROW_FN = `(day) => {
    const re = new RegExp('^' + day + '\\\\s*[A-Z][a-z]{2}');
    return Array.from(document.querySelectorAll('tbody tr')).find(tr => re.test((tr.textContent || '').trim())) || null;
  }`;

  async gotoMonth(year: number, month: number): Promise<void> {
    await this.navigate(`https://app.factorialhr.com/attendance/clock-in/monthly/${year}/${month}/1`);
    if (!this.page) throw new Error('Page not initialized');
    await this.page.waitForSelector('tbody tr button', { timeout: this.config.timeout });
    await this.delay(1000);
  }

  /** True when the row's "worked / expected" duration shows 0h expected (leave, holidays, weekends). */
  async dayExpectsNoHours(day: number): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate((dayNumber: number, rowFn: string) => {
      const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
      return !!tr && /\/\s*0h\s*00m/.test((tr.textContent || '').replace(/\s+/g, ' '));
    }, day, WebAutomation.DAY_ROW_FN);
  }

  /** Expands the day row. Returns 'expanded' | 'already-open' | 'disabled' (future day) | 'missing'. */
  async expandDay(day: number): Promise<'expanded' | 'already-open' | 'disabled' | 'missing'> {
    if (!this.page) throw new Error('Page not initialized');

    const result = await this.page.evaluate((dayNumber: number, rowFn: string) => {
      const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
      if (!tr) return 'missing';
      tr.scrollIntoView({ block: 'center' });
      const detail = tr.nextElementSibling;
      if (detail && detail.querySelector('[data-intercom-target="attendance-row-add-shift-button"]')) return 'already-open';
      const buttons = Array.from(tr.querySelectorAll('button')) as HTMLButtonElement[];
      const chevron = buttons[buttons.length - 1];
      if (!chevron || chevron.disabled || chevron.getAttribute('aria-disabled') === 'true') return 'disabled';
      chevron.click();
      return 'expanded';
    }, day, WebAutomation.DAY_ROW_FN);

    if (result === 'expanded') {
      await this.page.waitForFunction((dayNumber: number, rowFn: string) => {
        const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
        return !!tr?.nextElementSibling?.querySelector('[data-intercom-target="attendance-row-add-shift-button"]');
      }, {}, day, WebAutomation.DAY_ROW_FN);
    }
    return result as 'expanded' | 'already-open' | 'disabled' | 'missing';
  }

  /** True when the expanded day already lists at least one time range (e.g. "08:00 - 14:00"). */
  async dayHasExistingAttendanceValues(day: number): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate((dayNumber: number, rowFn: string) => {
      const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
      const detail = tr?.nextElementSibling;
      if (!detail) return false;
      const inputs = Array.from(detail.querySelectorAll('input')) as HTMLInputElement[];
      return inputs.some(input => /\d{1,2}:\d{2}/.test(input.value)) || /\d{1,2}:\d{2}/.test(detail.textContent || '');
    }, day, WebAutomation.DAY_ROW_FN);
  }

  /** Clicks "Add" on the expanded day, types the range into the popover and presses Apply. */
  async addTimeEntry(day: number, startTime: string, endTime: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');
    const page = this.page;

    const clicked = await page.evaluate((dayNumber: number, rowFn: string) => {
      const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
      const add = tr?.nextElementSibling?.querySelector('[data-intercom-target="attendance-row-add-shift-button"]') as HTMLElement | null;
      if (!add) return false;
      add.click();
      return true;
    }, day, WebAutomation.DAY_ROW_FN);
    if (!clicked) throw new Error(`Add button not found for day ${day}`);

    // The popover is rendered in a portal; its two time fields are text inputs with placeholder "--:--"
    const timeInputs = '[role="dialog"] input[placeholder="--:--"]';
    // Only the popover holds these inputs; other [role="dialog"] nodes (e.g. the "Saved successfully" toast) must not be waited on
    const popoverGone = () => !document.querySelector('[role="dialog"] input[placeholder="--:--"]');
    await page.waitForFunction((sel: string) => document.querySelectorAll(sel).length >= 2, {}, timeInputs);

    // Inputs are aria-hidden (click() hangs), so focus them and type digits; the mask adds the ":"
    const inputs = await page.$$(timeInputs);
    for (const [input, time] of [[inputs[0], startTime], [inputs[1], endTime]] as const) {
      await input.focus();
      await page.keyboard.type(time.replace(':', ''), { delay: 40 });
    }

    // Apply is disabled until both values are valid
    await page.waitForFunction(() => {
      const apply = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find(b => (b.textContent || '').trim() === 'Apply') as HTMLButtonElement | undefined;
      return !!apply && !apply.disabled;
    });
    await page.evaluate(() => {
      const apply = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find(b => (b.textContent || '').trim() === 'Apply') as HTMLButtonElement;
      apply.click();
    });
    await page.waitForFunction(popoverGone);

    // Wait for the saved range to show up in the day's detail row instead of sleeping
    await page.waitForFunction((dayNumber: number, rowFn: string, start: string) => {
      const tr = (eval(rowFn) as (d: number) => HTMLElement | null)(dayNumber);
      const detail = tr?.nextElementSibling;
      if (!detail) return false;
      const inputs = Array.from(detail.querySelectorAll('input')) as HTMLInputElement[];
      return inputs.some(i => i.value.includes(start)) || (detail.textContent || '').includes(start);
    }, { timeout: 5000 }, day, WebAutomation.DAY_ROW_FN, startTime).catch(() => this.delay(this.config.delayBetweenActions));
  }

  async screenshot(filename: string = 'screenshot.png'): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    const filepath = `${process.cwd()}/${filename}`;
    await this.page.screenshot({ path: filepath });
    console.log(`📸 Screenshot saved: ${filepath}`);
    return filepath;
  }

  async close(): Promise<void> {
    if (this.browser) {
      console.log('🔌 Closing browser...');
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getUserInput(question: string): Promise<string> {
    return new Promise(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async run(steps: WorkflowStep[]): Promise<void> {
    try {
      await this.launch();
      for (const step of steps) {
        await step(this);
      }
    } catch (error) {
      console.error('❌ Automation failed:', error);
      process.exit(1);
    } finally {
      if (this.config.autoCloseBrowser) {
        await this.close();
      }
    }
  }
}

// Helper function to determine day of week (0 = Sunday, 1 = Monday, etc.)
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// Helper function to get time entries based on day of week
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

export const workflows = {
  simpleLogin: (email: string, password: string, url: string): WorkflowStep[] => [
    async (auto: WebAutomation) => {
      await auto.navigate(url);
    },
    async (auto: WebAutomation) => {
      await auto.fillField('input[aria-label="Correo electrónico"]', email, 'Email');
    },
    async (auto: WebAutomation) => {
      await auto.fillField('input[type="password"]', password, 'Password');
    },
    async (auto: WebAutomation) => {
      await auto.clickButton('button[type="submit"]', 'Submit');
    },
    async (auto: WebAutomation) => {
      await auto.waitForNavigation();
    },
  ],

  multiStepLogin: (email: string, password: string, url: string): WorkflowStep[] => [
    async (auto: WebAutomation) => {
      await auto.navigate(url);
    },
    async (auto: WebAutomation) => {
      const alreadyLoggedIn = await auto.pageContainsText('/attendance/clock-in') || await auto.elementExists('a[href="/attendance/clock-in"]');
      if (alreadyLoggedIn) {
        console.log('✅ Session already authenticated; navigating directly to clock-in');
        await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
        return;
      }

      console.log('📌 Step 1: Email login');
      await auto.fillEmailField(email);
    },
    async (auto: WebAutomation) => {
      const alreadyLoggedIn = await auto.pageContainsText('/attendance/clock-in') || await auto.elementExists('a[href="/attendance/clock-in"]');
      if (alreadyLoggedIn) {
        console.log('✅ Session already authenticated; navigating directly to clock-in');
        await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
        return;
      }

      await auto.submitForm();
      await auto.waitForNavigation();
    },
    async (auto: WebAutomation) => {
      const alreadyLoggedIn = await auto.pageContainsText('/attendance/clock-in') || await auto.elementExists('a[href="/attendance/clock-in"]');
      if (alreadyLoggedIn) {
        console.log('✅ Session already authenticated; navigating directly to clock-in');
        await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
        return;
      }

      console.log('📌 Step 2: Password login');
      await auto.fillPasswordField(password);
    },
    async (auto: WebAutomation) => {
      const alreadyLoggedIn = await auto.pageContainsText('/attendance/clock-in') || await auto.elementExists('a[href="/attendance/clock-in"]');
      if (alreadyLoggedIn) {
        console.log('✅ Session already authenticated; navigating directly to clock-in');
        await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
        return;
      }

      await auto.submitForm();
      await auto.delay(2000);
    },
    async (auto: WebAutomation) => {
      const alreadyLoggedIn = await auto.pageContainsText('/attendance/clock-in') || await auto.elementExists('a[href="/attendance/clock-in"]');
      if (alreadyLoggedIn) {
        console.log('✅ Session already authenticated; navigating directly to clock-in');
        await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
        return;
      }

      console.log('📌 Step 3: Checking for 2FA...');
      const has2FA = await auto.pageContainsText('Autenticación de dos factores');

      if (has2FA) {
        console.log('🔐 2FA required');
        const code = await auto.getUserInput('🔐 Enter 6-digit authentication code: ');

        if (code.length !== 6 || !/^\d+$/.test(code)) {
          throw new Error('Invalid code format. Expected 6 digits.');
        }

        await auto.fillField('input[aria-label="Código"]', code, '2FA Code');
        await auto.submitForm();
        await auto.delay(2000);
      } else {
        console.log('✅ No 2FA required');
      }
    },
    async (auto: WebAutomation) => {
      console.log('📌 Step 4: Looking for clock-in link...');
      await auto.waitForSelector('a[href="/attendance/clock-in"]', 5000);
      await auto.clickButton('a[href="/attendance/clock-in"]', 'Clock-in link');
      console.log('✅ Logged in successfully and navigated to clock-in');
    },
  ],

  fillAttendanceCalendar: (year: number, month: number): WorkflowStep[] => [
    async (auto: WebAutomation) => {
      console.log(`📅 Starting to fill attendance calendar for ${month}/${year}`);
      const daysInMonth = new Date(year, month, 0).getDate();

      console.log(`📅 Found ${daysInMonth} days in the month`);
      await auto.gotoMonth(year, month);

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayOfWeek = getDayOfWeek(currentDate);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          console.log(`⏭️  Day ${day} (${dayName}) - Weekend, skipping`);
          continue;
        }

        const timeEntries = getTimeEntriesForDay(dayOfWeek);
        if (timeEntries.length === 0) {
          console.log(`⏭️  Day ${day} (${dayName}) - No entries needed`);
          continue;
        }

        console.log(`\n📌 Processing day ${day} (${dayName})`);

        try {
          if (await auto.dayExpectsNoHours(day)) {
            console.log(`⏭️  Day ${day} expects 0h (leave/holiday), skipping`);
            continue;
          }

          console.log(`📂 Opening day ${day}...`);
          const expandState = await auto.expandDay(day);
          if (expandState === 'missing') {
            console.log(`⚠️  Day ${day} could not be located, skipping`);
            continue;
          }
          if (expandState === 'disabled') {
            console.log(`⏭️  Day ${day} cannot be expanded (future day), skipping`);
            continue;
          }

          if (await auto.dayHasExistingAttendanceValues(day)) {
            console.log(`⏭️  Day ${day} already has values, skipping`);
            continue;
          }

          for (let i = 0; i < timeEntries.length; i++) {
            const entry = timeEntries[i];
            console.log(`⏰ Adding entry ${i + 1}: ${entry.startTime} - ${entry.endTime}`);
            await auto.addTimeEntry(day, entry.startTime, entry.endTime);
            console.log(`✅ Entry ${i + 1} saved for day ${day}`);
          }

          console.log(`✅ Day ${day} completed`);
        } catch (error) {
          console.error(`⚠️  Error processing day ${day}:`, error instanceof Error ? error.message : String(error));
        }
      }

      console.log('\n✅ Calendar filling completed');
    },
  ],
};
