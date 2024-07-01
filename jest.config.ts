// jest.config.ts
import { Config } from '@jest/types';

const config: Config.InitialOptions = {
    moduleDirectories: [
        "node_modules",
        "release/app/node_modules",
        "src",
    ],
    moduleFileExtensions: [
        "js",
        "jsx",
        "ts",
        "tsx",
        "json",
    ],
    moduleNameMapper: {
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/.erb/mocks/fileMock.js",
        "\\.(css|less|sass|scss)$": "identity-obj-proxy",
        "^@/(.*)$": "<rootDir>/src/renderer/$1",
        "^src/(.*)$": "<rootDir>/src/$1",
    },
    setupFiles: [
        "./.erb/scripts/check-build-exists.ts",
    ],
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
        url: "http://localhost/",
    },
    testPathIgnorePatterns: [
        "release/app/dist",
        ".erb/dll",
    ],
    transform: {
        "\\.(ts|tsx|js|jsx)$": "ts-jest",
    },
};

export default config;
