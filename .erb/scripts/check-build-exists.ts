// Check if the renderer and main bundles are built
import path from 'path'
import chalk from 'chalk'
import fs from 'fs'
import webpackPaths from '../configs/webpack.paths'

const mainPath = path.join(webpackPaths.distMainPath, 'main.js')
const rendererPath = path.join(webpackPaths.distRendererPath, 'renderer.js')

if (!fs.existsSync(mainPath)) {
    throw new Error(
        chalk.whiteBright.bgRed.bold('The main process is not built yet. Build it by running "npm run build:main"')
    )
}

if (!fs.existsSync(rendererPath)) {
    throw new Error(
        chalk.whiteBright.bgRed.bold(
            'The renderer process is not built yet. Build it by running "npm run build:renderer"'
        )
    )
}
