const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

const VueLoaderPlugin = require('vue-loader/lib/plugin');
module.exports = {
  entry: './src/main.js',
  module: {
    rules: [
      {test: /\.vue$/, use: 'vue-loader'},
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.js$/,
        use: {
          loader:'babel-loader',
          options:{
            presets:['@babel/preset-env']
          }
        }
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/*.html", to: "[name].[ext]" },
      ],
    }),
    new VueLoaderPlugin(),
  ],
};
