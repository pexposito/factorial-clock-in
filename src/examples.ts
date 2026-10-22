import { WebAutomation, workflows } from './workflows.js';

async function exampleMultiStepLogin() {
  const email = process.env.EMAIL || 'user@example.com';
  const password = process.env.PASSWORD || 'password123';
  const url = process.env.URL || 'https://example.com';

  const automation = new WebAutomation();
  await automation.run(workflows.multiStepLogin(email, password, url));
}

async function exampleCustom() {
  const automation = new WebAutomation({
    headless: false,
    autoCloseBrowser: false,
  });

  const customSteps = [
    async (auto: typeof automation) => {
      await auto.navigate(process.env.URL || 'https://example.com');
    },
    async (auto: typeof automation) => {
      console.log('📋 Page title:', await auto.page?.title());
    },
    async (auto: typeof automation) => {
      await auto.fillField('input[aria-label="Correo electrónico"]', 'test@example.com', 'Email');
    },
    async (auto: typeof automation) => {
      await auto.submitForm();
    },
    async (auto: typeof automation) => {
      await auto.delay(2000);
    },
  ];

  await automation.run(customSteps);
}

const example = process.argv[2] || 'login';
switch (example) {
  case 'login':
    exampleMultiStepLogin();
    break;
  case 'custom':
    exampleCustom();
    break;
  default:
    console.log('Available examples: login, custom');
    console.log('Usage: npx ts-node examples.ts [example]');
}
