// Only consumed by babel-jest (jest.config.js transforms .js/.jsx with rootMode 'upward').
// CRA compiles app code with its own inlined preset and ignores this file.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
