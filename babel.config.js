module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
          alias: {
            '@core': './src/core',
            '@ui': './src/ui',
            '@tests': './tests',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@constants': './src/ui/constants',
          },
        },
      ],
      'react-native-reanimated/plugin',
      '@babel/plugin-syntax-import-meta',
    ],
  };
};
