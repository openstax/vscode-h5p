# VScode H5P extension

A VSCode extension to play, create, edit and download H5P content inside your
Visual Studio Code IDE (Integrated Development Environment). This project is a
development effort to integrate H5P manipulation into Poet, a library developed
by Openstax.

The project is still in its early stages. If you find a problem, please create
an issue.

## Getting Started

You can build the extension by running this in the repository root:

```bash
npm install
npm run build
```

Package the extension to a vsix (installable in vscode/codium) by running:

```bash
npm run package
```

Run tests with

```bash
npm run test
```

## Launching the editor

The editor can be launched in two ways

1. Opening the submenu in the sidebar labeled 'H5P Editor' and then clicking the
   'Open H5P Editor' button.
2. Clicking the 'H5P Editor' button in the top right corner (NOTE: this button
   is only visible when a file is open).

While the editor is loading, there will be a spinning status indicator in your
vscode status bar (H5P Editor: Loading).

## Debugging the extension in VSCode

In the VSCode editor, open the debug panel and select `Launch Extension`. This
will open a new VSCode window with the extension running.

## Debugging the extension in Gitpod

The process of debugging the extension in Gitpod is similar; however, when the
debug tab opens in your browser, you will need to select a directory to open.
The extension will fail to launch with a message like 'Could not find workspace
folder' until you have opened a directory.

## Unit Tests

Ad previously mentioned, you can run unit tests with `npm run test`. Each
subproject (server and client) has its own test suite that can be run
individually using `--prefix server` or `--prefix client`.

Code coverage is only presented when you run the full tests suite. The coverage
is merged with `istanbul-merge`` and reported with `nyc report`. At the time of
writing this, coverage is reported in text, lcov, and html formats.

The final coverage results are in [coverage](./coverage).

## Features

- Download H5P content from the H5P Hub
- Create H5P content using preinstalled H5P libraries
- Edit H5P content
- Download the H5P content as a zip file
- Extract and display the H5P content in the editor

## Requirements

- VSCode
- NodeJS

## Adding and removing h5p libraries

- Supported libraries are defined in `server/src/models/OpenStax/config.ts`. To
  add a new library, add a new record to `supportedLibraries`. The key should be
  the name of the h5p library (like H5P.Blanks) and the value should be an
  object of type `SupportedLibrary`.
- During the build process (`npm run build`), each supported library is
  downloaded or updated.
- Libraries are saved in an append-only tar file
  (`server/out/h5p-libraries.tar.gz`).

## Adding CKEditor plugins

Plugins are included in the h5p-server archive named
[h5pServerArchiveName](./server/src/models/OpenStax/config.ts) which is created
by the [postbuild](./server/scripts/postbuild.ts) script.

To add a plugin, there are several steps:

1. Include the plugin repository as a git submodule inside
   `server/ckeditor-plugins`
1. Add the plugin path to the `CKEDITOR_PLUGIN_COPIES` in
   [postbuild](./server/scripts/postbuild.ts)
1. Add a step in the
   [addons.js editor plugin](./server/static/editor-plugins/addons.js) that adds
   the plugin to ckeditor config
1. Run `npm run build` in the repository root. This will, among other things,
   update the `addons.js` that is served by the H5P server and copy your new
   plugin into the archive that is extracted when the H5P server starts.
1. If all went well, you should see you plugin in the list of plugins included
   when you build the extension, ex: `Including ckeditor plugin "insertpre"`

## H5P Library Licenses

[H5P.Blanks](https://github.com/h5p/h5p-blanks),
[H5P.MultiChoice](https://github.com/h5p/h5p-multi-choice),
[H5P.QuestionSet](https://github.com/h5p/h5p-question-set), and
[H5P.TrueFalse](https://github.com/h5p/h5p-true-false) are included in the
packaged extension and they are provided under the following license:

> (The MIT License)
>
> Copyright (c) 2012-2014 Joubel AS
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## TODO

- [x] On save, save h5p.json and content.json to the workspace or specified
      location
- [x] Public/private switch (determines if answers are saved outside
      content.json or not)
- [x] Add command to open the manager
- [x] Bundle extension to vsix
- [x] Add tests
- [x] CI/CD
- [x] Support for extra openstax metadata with editor. It should be okay to save
      this metadata next to the h5p.json and content.json. H5P spec allows
      inclusion of arbitrary json files, so it would be safe to include this in
      the final h5p file too.
- [x] Custom content fs implementation that can 'hide' private solutions/hints
- [x] Pack h5p-php-library and h5p-editor-php-library into extension instead of
      downloading them
- [x] Use labels for field titles instead of headers
- [x] Add preview for collaborator solution fields (Toggle between edit and
      preview)
- [ ] Support for public solution subset (only even/odd solutions made private)
- [ ] Better Icon
- [ ] POET integration
- [ ] Cleanup tsconfig files

## Nice to Haves/Future Improvements

### User-Facing

- When I click the Save button, it gets a checkmark which then disappears. It is
  a bit confusing that it is the same green in both states, not saved and saved.
  It would be nice if the save button looked different when there are unsaved
  changes vs. no unsaved changes. (Requested by Ottó)
- When there is a save error, the save button turns red but it automatically
  resets after a set duration. If the Save button remains red until error is
  fixed, I think it is a perfect behaviour. (Requested by Ottó)
- Use H5P title as nickname (Problem: Cannot set default value of field directly
  (Would require selecting field from HTML))
- Support audio and video uploads too

### Developer-Facing

- Configure aliases for "common" in server and client (@common/...) so that the
  import paths are shorter/easier to understand
- Maybe update [AnswerYankers](./server/src/models/OpenStax/AnswerYankers.ts) to
  use the newer [walkJSON](./server/src/models/OpenStax/ContentMutators.ts#L48)
  to modify content instead of implementing bespoke procedures.

## Known Issues

- Copy and Paste & Replace H5P content buttons do not work
- H5P edit image button does not work (Tainted canvases may not be exported)
- CKEditor dialogs open offscreen (need to scroll up or down to find them)

## Authors

- [OpenStax CE-BE](https://github.com/openstax)
  - [Tyler Nullmeier](https://github.com/tylerzeromaster) 🇺🇸
  - [Samuel Klutse](https://samuelklutse.com) 🇹🇬
  - [Chris Kline](https://github.com/ckline-tryptic) 🇺🇸

## Release

Releases are handled by the scripts in the [scripts](./scripts/) directory.
These scripts were designed to run inside the
[release-vscode-extension](https://github.com/openstax/ce-pipelines/blob/5a1e0a70d5931bdaa7870bb41f4bc6e2debd551f/pipelines/release-vscode-extension.yml)
pipeline; however, you could also run them on your local machine with the
correct credentials.

The [build script](./scripts/build-for-release.sh) tries to fetch the last
version of the extension from openvsx so that it can include the previous
versions of the H5P libraries in the new release. You can disable this behavior
by setting the `CLEAN_H5P` environment variable before running the build.

## Other Notes

- The MathType editor supports editing MathML source (CTRL+Shift+X) and LaTeX
  source (CTRL+Shift+L)
- Some scripts are added to the editor via
  [H5P customizations](./server/src/models/OpenStax/H5PEditor.ts#L246)
- Some scripts are added to the player via
  [H5P customizations](./server/src/createH5PServer.ts#L139)
