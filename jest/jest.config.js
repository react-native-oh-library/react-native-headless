/**
 * Jest configuration for react-native-headless white-box unit tests.
 *
 * Follows the RNOH JS white-box testing pattern (rnoh-js-test / PR #3321):
 *  - plain `node` test environment, no device / no real react-native runtime
 *  - self-contained babel-jest transform (does NOT load the root
 *    babel.config.js, which targets Metro and the library build): TypeScript
 *    types are stripped and ES modules compiled to CommonJS for Node
 *  - react-native is fully mocked (see jest/react-native.js)
 *  - coverage is collected from the whole published JS/TS surface
 */

module.exports = {
  testEnvironment: 'node',
  // Config lives in jest/ but the package layout (src/, index.js, coverage/)
  // is rooted at the package root, so resolve everything from there.
  rootDir: '../',

  transform: {
    '^.+\\.(js|ts)$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          [
            '@babel/preset-env',
            {targets: {node: 'current'}, modules: 'commonjs'},
          ],
          ['@babel/preset-typescript', {allowDeclareFields: true}],
        ],
      },
    ],
  },

  moduleFileExtensions: ['js', 'ts', 'json'],

  // `*-test.js` (hyphen, in __tests__/) and `*.test.js` (dot) conventions
  testMatch: [
    '<rootDir>/jest/__tests__/*-test.js',
    '<rootDir>/jest/__tests__/*.test.js',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/example/',
    '<rootDir>/harmony/',
  ],

  setupFiles: ['<rootDir>/jest/setup.js'],

  globals: {
    __DEV__: true,
  },

  collectCoverageFrom: [
    '<rootDir>/src/**/*.{js,ts}',
    '<rootDir>/index.js',
    '!<rootDir>/src/**/__tests__/**',
  ],

  coverageDirectory: '<rootDir>/coverage',
  // v8 provider measures executed code at runtime: re-export-only modules
  // (src/index.js) and TurboModule specs would report an empty statementMap
  // with the default babel/istanbul instrumentation.
  coverageProvider: 'v8',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {branches: 90, functions: 90, lines: 90, statements: 90},
  },
};
