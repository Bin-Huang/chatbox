set -e

rm -rf out

npx electron-forge make -p win32 -a x64
npx electron-forge make -p win32 -a arm64

npx electron-forge make -p linux -a x64
npx electron-forge make -p linux -a arm64

npx electron-forge make -p darwin -a x64
npx electron-forge make -p darwin -a arm64
