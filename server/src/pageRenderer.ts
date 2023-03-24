import * as H5P from '@lumieducation/h5p-server';

export default function render(
    editor: H5P.H5PEditor
): (req: any, res: any) => any {
    return async (req, res) => {
        const contentIds = await editor.contentManager.listContent();
        const contentObjects = await Promise.all(
            contentIds.map(async (id) => ({
                content: await editor.contentManager.getContentMetadata(
                    id,
                    req.user
                ),
                id
            }))
        );
        res.send(`
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <script src="https://requirejs.org/docs/release/2.3.6/minified/require.js"></script>
			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
			<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
            <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
			<script src="https://cdn.jsdelivr.net/npm/popper.js@1.12.9/dist/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css">
            <title>H5P VSCode extension</title>
        </head>
        <body>
            <div class="container">
                <h1>H5P Vscode Viewer</h1>           
                <h2>
                    <span class="fa fa-file"></span> Existing content
                </h2>
                <a class="btn btn-primary my-2" href="${
                    editor.config.baseUrl
                }/new"><span class="fa fa-plus-circle m-2"></span>Create new content</a>
                <div class="list-group">
                ${contentObjects
                    .map(
                        (content) =>
                            `<div class="list-group-item">
                                <div class="d-flex w-10">
                                    <div class="me-auto p-2 align-self-center">
                                        <a href="${editor.config.baseUrl}${editor.config.playUrl}/${content.id}">
                                            <h5>${content.content.title}</h5>
                                        </a>
                                        <div class="small d-flex">                                            
                                            <div class="me-2">
                                                <span class="fa fa-book-open"></span>
                                                ${content.content.mainLibrary}
                                            </div>
                                            <div class="me-2">
                                                <span class="fa fa-fingerprint"></span>
                                                ${content.id}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-2">                                        
                                        <a class="btn btn-secondary" href="${editor.config.baseUrl}/edit/${content.id}">
                                            <span class="fa fa-pencil-alt m-1"></span>
                                            edit
                                        </a>
                                    </div>
                                    <div class="p-2">
                                        <a class="btn btn-info" href="${editor.config.baseUrl}${editor.config.downloadUrl}/${content.id}">
                                            <span class="fa fa-file-download m-1"></span>
                                            download
                                        </a>
                                    </div>
                                    <div class="p-2">
                                        <a class="btn btn-info" href="${editor.config.baseUrl}/html/${content.id}">
                                            <span class="fa fa-file-download m-1"></span>
                                            download HTML
                                        </a>
                                    </div>
                                    <div class="p-2">
                                        <a class="btn btn-danger" href="${editor.config.baseUrl}/delete/${content.id}">
                                            <span class="fa fa-trash-alt m-1"></span>
                                            delete
                                        </a>
                                    </div>
                                </div>                                
                            </div>`
                    )
                    .join('')}
                </div>
                <hr/>
                <div id="content-type-cache-container"></div>
                <hr/>
                <div id="library-admin-container"></div>
            </div>

            <script>
                requirejs.config({
                    baseUrl: "assets/js",
                    paths: {
                        react: '/node_modules/react/umd/react.development',
                        "react-dom": '/node_modules/react-dom/umd/react-dom.development'
                    }
                });
                requirejs([
                    "react",
                    "react-dom",
                    "./components/LibraryAdminComponent.js",
                    "./components/ContentTypeCacheComponent.js"], 
                    function (React, ReactDOM, LibraryAdmin, ContentTypeCache) {
                        const libraryAdminContainer = document.querySelector('#library-admin-container');
                        ReactDOM.render(React.createElement(LibraryAdmin.default, { endpointUrl: 'h5p/libraries' }), libraryAdminContainer);
                        const contentTypeCacheContainer = document.querySelector('#content-type-cache-container');
                        ReactDOM.render(React.createElement(ContentTypeCache.default, { endpointUrl: 'h5p/content-type-cache' }), contentTypeCacheContainer);
                    });                
            </script>
        </body>
        `);
    };
}
