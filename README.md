# VScode H5P extension

A VSCode extension to play, create, edit and download H5P content inside your
Visual Studio Code IDE (Integrated Development Environment). This project is a
development effort to integrate H5P manipulation into Poet, a library developed
by Openstax.

`The project is still in its early stages and is not yet ready for production use.`

## Getting Started

```bash
git clone https://github.com/sparksam/vscode-h5p
cd vscode-h5p
npm install
./scripts/build.sh

```

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
  - [ ] On save, zip the content and save it to the workspace or specified location
  - [ ] Add command to open the manager
  - [ ] Contextual menu option for h5p files
  - [ ] Add tests
  - [ ] CI/CD

## Author

- [Samuel Klutse](https://samuelklutse.com) 🇹🇬
