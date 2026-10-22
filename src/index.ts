import { loadAppConfig } from './config.js';
import { WebAutomation, workflows } from './workflows.js';

async function main() {
  const args = process.argv.slice(2);
  const config = loadAppConfig(args);

  if (!config.email) {
    console.error('❌ Email is required.');
    console.error(`Provide it through CLI args, environment variables, or ${config.configFilePath}`);
    process.exit(1);
  }

  if (!config.password) {
    console.error('❌ Password is required.');
    console.error(`Provide it through CLI args, environment variables, or ${config.configFilePath}`);
    process.exit(1);
  }

  if (!config.url) {
    console.error('❌ URL is required.');
    console.error(`Provide it through CLI args, environment variables, or ${config.configFilePath}`);
    process.exit(1);
  }

  const automation = new WebAutomation({
    headless: config.headless,
    autoCloseBrowser: !config.keepOpen,
  });

  const steps = [
    ...workflows.multiStepLogin(config.email, config.password, config.url),
    ...workflows.fillAttendanceCalendar(config.year, config.month),
  ];

  await automation.run(steps);
}

main();
