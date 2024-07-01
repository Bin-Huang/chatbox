/**
 * Base webpack config used across other specific configs
 */

import webpack from 'webpack'
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin'
import webpackPaths from './webpack.paths'
import { dependencies as externals } from '../../release/app/package.json'

const configuration: webpack.Configuration = {
    externals: [...Object.keys(externals || {})],

    stats: 'errors-only',

    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        // Remove this line to enable type checking in webpack builds
                        transpileOnly: true,
                        compilerOptions: {
                            module: 'esnext',
                        },
                    },
                },
            },
        ],
    },

    output: {
        path: webpackPaths.srcPath,
        library: {
            type: 'commonjs2',
        },
    },

    resolve: {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        modules: [webpackPaths.srcPath, 'node_modules'],
        plugins: [new TsconfigPathsPlugins()],
    },

    plugins: [
        new webpack.EnvironmentPlugin({
            NODE_ENV: 'production',
            CHATBOX_BUILD_TARGET: 'unknown',
            CHATBOX_BUILD_PLATFORM: 'unknown',
            USE_LOCAL_API: '',
        }),
    ],
}

export default configuration
