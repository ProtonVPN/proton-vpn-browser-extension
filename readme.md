# Getting Started

You'll need to have the following environment to work with this project:

- Node.js LTS
- [pnpm](https://pnpm.io/installation) (version pinned in `packageManager` in `package.json`)

If you don't have pnpm, you can enable the exact pinned version with:
```
npm install --global corepack@latest
corepack enable pnpm
```

Then install dependencies:
```
pnpm install
```

# Build for Firefox

```
pnpm build-ff
```

Auto-reload on change:
```
pnpm watch-ff
```

# Build for Chrome

```
pnpm build
```

Auto-reload on change:
```
pnpm watch
```

Main config values are exposed in `config.js` at the root of the project
for QA and dev to conveniently create custom-builds.

# Build exact version from ZIP

Requirements:
- Node.js LTS (which includes `npm` and `npx`)
- `zip` and `unzip` commands

pnpm does not need to be installed: the commands below use `npx` to run the
exact pnpm version this project is locked with. `--frozen-lockfile` installs
the exact dependency versions from `pnpm-lock.yaml`.

The commands are meant for a POSIX shell (Linux or macOS). On Windows, run them
in WSL.

To get the exact same build from source.zip, extract its content in an empty
folder then run:

Firefox:
```
npx --yes pnpm@12.21.0 install --frozen-lockfile
npx --yes pnpm@12.21.0 run pack-ff
```

Will generate: `vpn-proton-firefox.zip`

Chrome:
```
npx --yes pnpm@12.21.0 install --frozen-lockfile
npx --yes pnpm@12.21.0 run pack
```

Will generate: `vpn-proton-chrome.zip`

All steps including unzipping and dependencies install (Debian/Ubuntu):
```
apt-get install zip unzip
unzip source.zip -d vpn-bex
cd vpn-bex
npx --yes pnpm@12.21.0 install --frozen-lockfile
npx --yes pnpm@12.21.0 run pack-ff
mv vpn-proton-firefox.zip ../vpn-proton-firefox.zip
cd ..
rm -rf vpn-bex
```
