const nodeTransform = [
  'babel-jest',
  {
    configFile: false,
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-typescript',
    ],
  },
]

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'core',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/core/**/__tests__/**/*.test.ts',
        '<rootDir>/src/react/**/__tests__/**/*.test.ts',
      ],
      transform: { '^.+\\.tsx?$': nodeTransform },
    },
    {
      displayName: 'native',
      preset: 'react-native',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.tsx'],
      testPathIgnorePatterns: ['\\.web\\.test\\.tsx$'],
      moduleNameMapper: {
        '^@lodev09/react-native-true-sheet$':
          '<rootDir>/jest.mocks/true-sheet.tsx',
      },
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.web.test.tsx'],
      moduleFileExtensions: [
        'web.tsx',
        'web.ts',
        'web.js',
        'tsx',
        'ts',
        'jsx',
        'js',
        'json',
        'node',
      ],
      moduleNameMapper: { '^react-native$': 'react-native-web' },
      transform: {
        '^.+\\.(t|j)sx?$': [
          'babel-jest',
          {
            configFile: false,
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        ],
      },
    },
  ],
}
