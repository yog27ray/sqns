// eslint-disable-next-line no-undef
module.exports = {
  coverageProvider: 'v8',
  extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'cjs'],
  transform: {
    // TS stays on ts-jest in ESM mode
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'Bundler', // or 'NodeNext'
      },
    }],

    // NEW: transpile ESM JS from node_modules (e.g., jose) to CJS for Jest
    '^.+\\.[cm]?js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(uuid|jose)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  clearMocks: true,
  verbose: false,
  reporters: [
    ['jest-simple-dot-reporter', { color: true }]
  ],
};
