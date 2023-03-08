set -e

rm -rf out

npx electron-forge make -p win32

npx electron-forge make -p linux

npx electron-forge make -p darwin -a x64
npx electron-forge make -p darwin -a arm64
