set -e

rm -rf out

npx electron-forge make -p win32 -a x64
# npx electron-forge make -p win32 -a arm64

npx electron-forge make -p linux -a x64
# npx electron-forge make -p linux -a arm64

npx electron-forge make -p darwin -a x64
# npx electron-forge make -p darwin -a arm64

mkdir -p out/release

# cp out/make/deb/arm64/chatbox_0.0.7_arm64.deb out/release/chatbox_0.0.7_arm64.deb
cp out/make/deb/x64/chatbox_0.0.7_amd64.deb out/release/chatbox_0.0.7_amd64.deb

# cp 'out/make/squirrel.windows/arm64/chatbox-0.0.7 Setup.exe' out/release/chatbox_0.0.7_arm64_setup.exe
cp 'out/make/squirrel.windows/x64/chatbox-0.0.7 Setup.exe' out/release/chatbox_0.0.7_x64_setup.exe

# cp out/make/zip/linux/arm64/chatbox-linux-arm64-0.0.7.zip out/release/chatbox-linux-arm64-0.0.7.zip
cp out/make/zip/linux/x64/chatbox-linux-x64-0.0.7.zip out/release/chatbox-linux-x64-0.0.7.zip

# cp out/make/zip/win32/arm64/chatbox-win32-arm64-0.0.7.zip out/release/chatbox-win32-arm64-0.0.7.zip
cp out/make/zip/win32/x64/chatbox-win32-x64-0.0.7.zip out/release/chatbox-win32-x64-0.0.7.zip

# cp out/make/chatbox-0.0.7-arm64.dmg out/release/chatbox-0.0.7-arm64.dmg
cp out/make/chatbox-0.0.7-x64.dmg out/release/chatbox-0.0.7.dmg

# cp out/make/zip/darwin/arm64/chatbox-darwin-arm64-0.0.7.zip out/release/chatbox-darwin-arm64-0.0.7.zip
cp out/make/zip/darwin/x64/chatbox-darwin-x64-0.0.7.zip out/release/chatbox-darwin-0.0.7.zip
