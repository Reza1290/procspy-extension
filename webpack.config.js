import path from 'path'
import { glob } from 'glob'
import CopyPlugin from 'copy-webpack-plugin'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const entryFiles = await glob('src/pages/**/index.js')
const pageEntries = entryFiles.reduce((entries, file) => {
  const name = file
    .replace(/^src\/pages\//, '')
    .replace(/\/index\.js$/, '')
    .replace(/\//g, '_')
  entries[`pages/${name}`] = `./${file}`
  return entries
}, {})

export default {
  mode: 'production',
  entry: {
    index: './index.js',
    background: './src/background/service-worker.js',
    procspy: './src/scripts/procspy.js',
    ask_permissions: './src/scripts/ask_permissions.js',
    ...pageEntries, 
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'scripts/[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'assets/', to: 'assets/' },
        { from: 'page/', to: 'page/' },
        { from: 'index.html', to: '.' },
      ],
    }),
  ],
  devtool: 'source-map',
}
