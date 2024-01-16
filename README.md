# VScode H5P extension

A VSCode extension to play, create, edit and download H5P content inside your
Visual Studio Code IDE (Integrated Development Environment). This project is a
development effort to integrate H5P manipulation into Poet, a library developed
by Openstax.

`The project is still in its early stages and is not yet ready for production use.`

## Getting Started

```bash
git clone https://github.com/openstax/vscode-h5p
cd vscode-h5p
npm install
npm run build

```

## Run the extension in a new VSCode

In the VSCode editor, open the debug panel and select `Launch Extension`. This
will open a new VSCode window with the extension running. Clinking on a
`H5P zipped file` in the workspace will open the H5P manager.

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
1. Add the plugin path to the `pluginPaths` in
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
- [ ] Extension settings
- [x] Bundle extension to vsix
- [x] Add tests
- [ ] CI/CD
- [x] Support for extra openstax metadata with editor. It should be okay to save
      this metadata next to the h5p.json and content.json. H5P spec allows
      inclusion of arbitrary json files, so it would be safe to include this in
      the final h5p file too.
- [x] Custom content fs implementation that can 'hide' private solutions/hints -
      Maybe different names (not content id)
- [ ] Pack h5p-php-library and h5p-editor-php-library into extension instead of
      downloading them
- [ ] Use labels for field titles instead of headers
- [ ] Cleanup tsconfig files
- [ ] Add preview for collaborator solution fields (Toggle between edit and
      preview)
- [ ] (Maybe) Use title as nickname (Problem: Cannot set default value of field
      directly (Would require selecting field from HTML))
- [ ] (Maybe) Configure aliases for "common" in server and client (@common/...)
- [ ] (Maybe) Support audio and video uploads too
- [ ] POET integration

## Known Issues

- Copy and Paste & Replace H5P content buttons do not work
- H5P edit image button does not work (Tainted canvases may not be exported)

## Authors

- [OpenStax CE-BE](https://github.com/openstax)
  - [Tyler Nullmeier](https://github.com/tylerzeromaster) 🇺🇸
  - [Samuel Klutse](https://samuelklutse.com) 🇹🇬
  - [Chris Kline](https://github.com/ckline-tryptic) 🇺🇸

## What we still need to know

- What metadata should be added
- How private solutions will be handled - Probably placeholder values
