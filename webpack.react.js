const path = require('path');

module.exports = {
  entry: './src/react-sidepanel/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'sidepanel-react-bundle.js',
    clean: false, // Don't clean the entire dist folder
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.react.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: false, // Disable minification for easier debugging
  },
  // Chrome extension specific settings
  target: 'web',
  mode: 'development',
  devtool: 'source-map',
};