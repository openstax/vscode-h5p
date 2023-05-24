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
./scripts/build.sh

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

## TODO

- [ ] On save, save h5p.json and content.json to the workspace or specified
      location (partially done, need configuration options)
- [ ] Public/private switch (determines where files save to)
- [x] Add command to open the manager
- [ ] Extension settings
- [ ] Bundle extension to vsix
- [ ] Add tests
- [ ] CI/CD
- [ ] Support for extra openstax metadata with editor. It should be okay to save
      this metadata next to the h5p.json and content.json. H5P spec allows
      inclusion of arbitrary json files, so it would be safe to include this in
      the final h5p file too.

## Author

- [Samuel Klutse](https://samuelklutse.com) 🇹🇬
