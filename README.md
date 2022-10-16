* Preparation

npm init

* Frontend

** Development
npm run react-start
npm run electron-dev-mac (in second terminal)

* Native node module

npm install node-gyp -g

# Rebuild for specific electron version: --target = electron version
node-gyp rebuild

# If there is a ld:warning: was built for newer macOS version (12.0) than being linked (11.0) then do
export LDFLAGS="-mmacosx-version-min=12.0"

# This will rebuild the video.node module for the electron version
./node_modules/.bin/electron-rebuild



In Austria, when you earn less than a certain amount of money (730 Euro a year) you don't have to pay taxes for it.
You can read about it here: https://www.arbeiterkammer.at/beratung/steuerundeinkommen/dazuverdienen/Arbeitsverhaeltnis_und_freier_Dienstvertrag.html

The relevant part is: "Ist der Gewinn kleiner als 730 €, bleibt er steuerfrei." which translates to "If the profit is less than €730, it remains tax-free."
