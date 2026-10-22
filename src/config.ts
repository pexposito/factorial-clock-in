import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AppConfig {
  email: string;
  password: string;
  url: string;
  year: number;
  month: number;
  headless: boolean;
  keepOpen: boolean;
  configFilePath: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseProperties(contents: string): Record<string, string> {
  const properties: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties[key] = value;
  }

  return properties;
}

export function loadAppConfig(args: string[]): AppConfig {
  const configFilePath = path.resolve(process.cwd(), 'config.properties');
  const properties = fs.existsSync(configFilePath)
    ? parseProperties(fs.readFileSync(configFilePath, 'utf8'))
    : {};

  const email = args[0] || process.env.EMAIL || properties.EMAIL || properties.email || '';
  const password = args[1] || process.env.PASSWORD || properties.PASSWORD || properties.password || '';
  const url = args[2] || process.env.URL || properties.URL || properties.url || '';
  const year = parseInteger(args[3] || process.env.YEAR || properties.YEAR || properties.year, new Date().getFullYear());
  const month = parseInteger(args[4] || process.env.MONTH || properties.MONTH || properties.month, new Date().getMonth() + 1);
  const headless = parseBoolean(process.env.HEADLESS || properties.HEADLESS || properties.headless, false);
  const keepOpen = parseBoolean(process.env.KEEP_OPEN || properties.KEEP_OPEN || properties.keepOpen, false);

  return {
    email,
    password,
    url,
    year,
    month,
    headless,
    keepOpen,
    configFilePath,
  };
}
