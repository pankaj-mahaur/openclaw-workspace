const { withExpo } = require('@expo/webpack-config');

module.exports = (env, argv) => {
  return withExpo({
    webpack: (config, { platform, ...options }) => {
      if (platform === 'web') {
        // Add web-specific configurations
        config.resolve.alias = {
          ...config.resolve.alias,
          'react-native$': 'react-native-web',
          'react-native/Libraries/Animated/NativeAnimatedHelper': 'react-native-web/dist/exports/Animated',
        };

        // Add CSS support
        config.module.rules.push({
          test: /\.(css|scss)$/,
          use: ['style-loader', 'css-loader'],
        });

        // Add responsive viewport meta tag
        config.plugins.push({
          apply: (compiler) => {
            compiler.hooks.compilation.tap('ViewportPlugin', (compilation) => {
              compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tap('ViewportPlugin', (data) => {
                data.html = data.html.replace(
                  '</head>',
                  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></head>'
                );
              });
            });
          },
        });
      }
      return config;
    },
  });
};