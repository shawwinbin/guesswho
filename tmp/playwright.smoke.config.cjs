const { devices } = require('@playwright/test');

module.exports = {
  testDir: '.',
  testMatch: ['history-h5.smoke.spec.js'],
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'line',
  use: {
    baseURL: 'https://nas.shawdaxia.top:8083',
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    launchOptions: {
      executablePath: '/Users/shaw/Library/Caches/ms-playwright/chromium-1181/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      args: ['--disable-crash-reporter', '--disable-crashpad'],
    },
    ...devices['Pixel 7'],
  },
};
