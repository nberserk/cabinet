
## Table of Contents

- [Table of Contents](#table-of-contents)
- [Intro](#intro)
- [Features](#features)
- [Installation](#installation)
  - [For Chrome: ](#for-chrome-)
- [Install dependency for turborepo: ](#install-dependency-for-turborepo-)
  - [For root: ](#for-root-)
  - [For module: ](#for-module-)
- [How do I disable modules I'm not using?](#how-do-i-disable-modules-im-not-using)
- [Environment variables](#environment-variables)
- [Boilerplate structure ](#boilerplate-structure-)
  - [Chrome extension ](#chrome-extension-)
  - [Pages ](#pages-)
  - [Packages ](#packages-)
- [Debugging](#debugging)
- [Reference](#reference)

## Intro

The Cabinet is a Chrome extension for professional tab management that visualizes browser tabs in hierarchical tree structures. Each window's tab relationships are organized into a "Cabinet" - a complete snapshot of your tab hierarchy that can be saved to local storage and restored at any time, preserving the exact parent-child relationships between tabs.

## Features

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwindcss](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/) with [Rollup](https://rollupjs.org/)
- [Turborepo](https://turbo.build/repo)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)
- [Chrome Extensions Manifest Version 3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Custom i18n package](/packages/i18n/)
- [Custom HMR (Hot Module Rebuild) plugin](/packages/hmr)
- [End-to-end testing with WebdriverIO](https://webdriver.io/)

## Installation

1. Clone this repository.( ```git clone https://github.com/nberserk/cabinet``` )
2. Ensure your node version is >= than in `.nvmrc` file, recommend to use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro)
5. Install pnpm globally: `npm install -g pnpm`
6. Run `pnpm install`
7. Check if you have that configuration in your IDE/Editor:
    - <b>VS Code</b>:
        - Installed [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
        - Installed [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
        - Enabled `Typescript Workbench version` in settings:
            - CTRL + SHIFT + P -> Search: `Typescript: Select Typescript version...` -> `Use Workbench version`
            - [Read more](https://code.visualstudio.com/docs/languages/typescript#_using-newer-typescript-versions)
        - Optional, for imports to work correctly in WSL, you might need to install the [Remote - WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) extension and connect to WSL remotely from VS Code. See overview section in the extension page for more information.
    - <b>WebStorm</b>:
      - Configured [ESLint](https://www.jetbrains.com/help/webstorm/eslint.html#ws_eslint_configure_run_eslint_on_save)
      - Configured [Prettier](https://prettier.io/docs/en/webstorm.html)
      - Optional, but useful `File | Settings | Tools | Actions on Save`\
      -> `Optimize imports` and `Reformat code`
8. Run `pnpm update-version <version>` for change the `version` to the desired version of your extension.

> [!IMPORTANT]
> On Windows, make sure you have WSL enabled and Linux distribution (e.g. Ubuntu) installed on WSL.
> 
> [Installation Guide](https://learn.microsoft.com/en-us/windows/wsl/install)

<b>Then, depending on the target browser:</b>

### For Chrome: <a name="installation-chrome"></a>

1. Run:
    - Dev: `pnpm dev` (on Windows, you should run as administrator;
      see [issue#456](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite/issues/456))
    - Prod: `pnpm build`
2. Open in browser - `chrome://extensions`
3. Check - <kbd>Developer mode</kbd>
4. Click - <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the boilerplate project

## Install dependency for turborepo: <a name="install-dependency"></a>

### For root: <a name="install-dependency-for-root"></a>

1. Run `pnpm i <package> -w`

### For module: <a name="install-dependency-for-module"></a>

1. Run `pnpm i <package> -F <module name>`

`package` - Name of the package you want to install e.g. `nodemon` \
`module-name` - You can find it inside each `package.json` under the key `name`, e.g. `@extension/content-script`, you
can use only `content-script` without `@extension/` prefix

## How do I disable modules I'm not using?

[Read here](packages/module-manager/README.md)

## Environment variables

Read: [Env Documentation](packages/env/README.md)

## Boilerplate structure <a name="structure"></a>

### Chrome extension <a name="structure-chrome-extension"></a>

The extension lives in the `chrome-extension` directory and includes the following files:

- [`manifest.ts`](chrome-extension/manifest.ts) - script that outputs the `manifest.json`
- [`src/background`](chrome-extension/src/background) - [background script](https://developer.chrome.com/docs/extensions/mv3/background_pages/)
  (`background.service_worker` in manifest.json)
- [`public`](chrome-extension/public/) - icons referenced in the manifest; content CSS for user's page injection


### Pages <a name="structure-pages"></a>

Code that is transpiled to be part of the extension lives in the [pages](pages) directory.

- [`content`](pages/content) - Scripts injected into specified pages (You can see it in console)
- [`content-ui`](pages/content-ui) - React Components injected into specified pages (You can see it at the very bottom of pages)
- [`content-runtime`](pages/content-runtime/src/) - [injected content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#functionality)
  This can be injected from e.g. `popup` like standard `content`
- [`devtools`](pages/devtools/) - [extend the browser DevTools](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools#creating)
  (`devtools_page` in manifest.json)
- [`devtools-panel`](pages/devtools-panel/) - [DevTools panel](https://developer.chrome.com/docs/extensions/reference/api/devtools/panels)
  for [devtools](pages/devtools/src/index.ts)
- [`new-tab`](pages/new-tab/) - [override the default New Tab page](https://developer.chrome.com/docs/extensions/develop/ui/override-chrome-pages)
  (`chrome_url_overrides.newtab` in manifest.json)
- [`options`](pages/options/) - [options page](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
  (`options_page` in manifest.json)
- [`popup`](pages/popup/) - [popup](https://developer.chrome.com/docs/extensions/reference/api/action#popup) shown when
  clicking the extension in the toolbar
  (`action.default_popup` in manifest.json)
- [`side-panel`](pages/side-panel/) - [sidepanel (Chrome 114+)](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
  (`side_panel.default_path` in manifest.json)

### Packages <a name="structure-packages"></a>

Some shared packages:

- `dev-utils` - utilities for Chrome extension development (manifest-parser, logger)
- `env` - exports object which contain all environment variables from `.env` and dynamically declared
- `hmr` - custom HMR plugin for Vite, injection script for reload/refresh, HMR dev-server
- `i18n` - custom internationalization package; provides i18n function with type safety and other validation
- `shared` - shared code for the entire project (types, constants, custom hooks, components etc.)
- `storage` - helpers for easier integration with [storage](https://developer.chrome.com/docs/extensions/reference/api/storage), e.g. local/session storages
- `tailwind-config` - shared Tailwind config for entire project
- `tsconfig` - shared tsconfig for the entire project
- `ui` - function to merge your Tailwind config with the global one; you can save components here
- `vite-config` - shared Vite config for the entire project

Other useful packages:

- `zipper` - run `pnpm zip` to pack the `dist` folder into `extension-YYYYMMDD-HHmmss.zip` inside the newly created
  `dist-zip`
- `module-manager` - run `pnpm module-manager` to enable/disable modules
- `e2e` - run `pnpm e2e` for end-to-end tests of your zipped extension on different browsers


## Debugging

If you're debugging one, you can use [Brie](https://go.briehq.com/github?utm_source=CEB) lets you capture screenshots, errors, and network activity, making it easier for us to help.

## Reference

- template is taken from https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite
- [Chrome Extensions](https://developer.chrome.com/docs/extensions)
- [Vite Plugin](https://vitejs.dev/guide/api-plugin.html)
- [Rollup](https://rollupjs.org/guide/en/)
- [Turborepo](https://turbo.build/repo/docs)
- [Rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)
