## Preparation

npm init

## Frontend

### Development
npm run react-start
npm run electron-dev-mac (in second terminal)

### Native node module

npm install node-gyp -g

* Rebuild for specific electron version: --target = electron version
node-gyp rebuild

* **Mac only:** If there is a warning *"... was built for newer macOS version (12.0) than being linked (11.0)"* then do
export LDFLAGS="-mmacosx-version-min=12.0"

* This will rebuild the video.node module for the electron version
./node_modules/.bin/electron-rebuild
