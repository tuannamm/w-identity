const path = require('node:path');

module.exports = {
  projects: ['mongo', 'profile', 'e2e'].map((name) => ({
    displayName: name,
    rootDir: path.resolve(__dirname, '..'),
    testEnvironment: 'node',
    transform: {},
    testMatch: [
      `<rootDir>/test/${name === 'e2e' ? 'identity.e2e' : `${name}.integration`}.spec.mjs`,
    ],
    restoreMocks: true,
  })),
};
