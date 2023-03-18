import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel, MakerSquirrelConfig } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { PublisherGitHubConfig, PublisherGithub } from '@electron-forge/publisher-github'
// import { MakerRpm } from '@electron-forge/maker-rpm';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
    packagerConfig: {
        // icon: './src/resources/icon/chatbox',
        osxSign: {},
        osxNotarize: {
            tool: 'notarytool',
            appleId: process.env.APPLE_ID as any,
            appleIdPassword: process.env.APPLE_PASSWORD as any,
            teamId: process.env.APPLE_TEAM_ID as any,
        }
    },
    rebuildConfig: {},
    makers: [
        new MakerSquirrel({}),
        new MakerZIP({}, ['darwin', 'linux', 'win32']),
        // new MakerRpm({}),
        new MakerDeb({}),
        new MakerDMG({}),
    ],
    plugins: [
        new WebpackPlugin({
            mainConfig,
            renderer: {
                config: rendererConfig,
                entryPoints: [
                    {
                        html: './src/index.html',
                        js: './src/renderer.ts',
                        name: 'main_window',
                        preload: {
                            js: './src/preload.ts',
                        },
                    },
                ],
            },
        }),
    ],
    publishers: [
        new PublisherGithub({
            repository: {
                owner: 'Bin-Huang',
                name: 'chatbox',
            },
            prerelease: true,
        })
    ],
};

export default config;
