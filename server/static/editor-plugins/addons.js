// https://h5p.org/adding-text-editor-buttons

(function ($) {
  $(document).ready(function () {
    if (!window.CKEDITOR) {
      return;
    }

    // Register our plugin
    H5PEditor.HtmlAddons = H5PEditor.HtmlAddons || {};
    // This math tag is added to semantic entries in the server (inside OSH5PEditor)
    H5PEditor.HtmlAddons.html = H5PEditor.HtmlAddons.html || {};
    H5PEditor.HtmlAddons.html.addons = function (config, tags) {
      // Eanble additional plugins here
      // This list is also in `downloadLibraries`; DRY?
      const plugins = [
        'h5pimageupload',
        'ckeditor_wiris',
        'blockquote',
        'image',
        'sourcearea',
        'indent',
        'indentblock',
        'indentlist',
        'iframe',
        'codeTag',
        'insertpre',
      ];
      // Configure toolbar here (NOTE: not all plugins have toolbar buttons)
      const toolbarAdditions = [
        {
          name: 'ckeditor_wiris',
          items: ['ckeditor_wiris_formulaEditor']
        },
        {
          name: 'format',
          items: [
            'Indent',
            'Outdent',
            'Code',
          ]
        },
        {
          name: 'insert',
          items: [
            'Iframe',
            'InsertPre',
            'H5PImageUpload',
          ],
        },
        {
          name: 'advanced',
          items: [
            'Source',
          ]
        }
      ];
      // Add the plugins to the list of extra plugins.
      config.extraPlugins = (config.extraPlugins ? ',' : '') + plugins.join(',');
      // Add the plugins to toolbar.
      config.toolbar.push(...toolbarAdditions);
    };
  });
})(H5P.jQuery);
