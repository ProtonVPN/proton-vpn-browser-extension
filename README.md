# Getting Started

You'll need to have the following environment to work with this project:

- Node.js LTS (recommended: latest LTS)
- npm (comes with Node.js)
- (Optional) **zip/unzip** utilities for packing builds
- (Optional, Linux/WSL) `apt-get install zip unzip`

That's all folks! 🎉

---

## Build for Firefox
```bash
npm install
npm run build-ff

# Build for Chrome

```
npm install
npm run build
```

Auto-reload on change:
```
npm run watch
```

Main config values are exposed in `config.js` at the root of the project
for QA and dev to conveniently create custom-builds.

# Build exact version from ZIP

To get the exact same build from source.zip, extract its content in an empty
folder then run:

Firefox:
```
npm ci && npm run pack-ff
```

Will generate: `vpn-proton-firefox.zip`

Chrome:
```
npm ci && npm run pack
```

Will generate: `vpn-proton-chrome.zip`

All steps including unzipping and dependencies install:
```
apt-get install zip
unzip source.zip -d vpn-bex
cd vpn-bex
npm ci
npm run pack-ff
mv vpn-proton-firefox.zip ../vpn-proton-firefox.zip
cd ..
rm -rf vpn-bex
```
