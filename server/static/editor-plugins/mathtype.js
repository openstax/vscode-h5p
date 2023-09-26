// https://h5p.org/adding-text-editor-buttons

(function ($) {
  $(document).ready(function () {
    if (!window.CKEDITOR) {
      return;
    }

    // Register our plugin
    H5PEditor.HtmlAddons = H5PEditor.HtmlAddons || {};
    // This math tag is added to semantic entries in the server (inside OSH5PEditor)
    H5PEditor.HtmlAddons.math = H5PEditor.HtmlAddons.math || {};
    H5PEditor.HtmlAddons.math.math = function (config, tags) {
      // Add the MathType plugin.
      config.extraPlugins = (config.extraPlugins ? ',' : '') + 'ckeditor_wiris';

      // Add plugin to toolbar.
      config.toolbar.push({
        name: 'wirisplugins',
        items: ['ckeditor_wiris_formulaEditor'],
      });
    };
  });
})(H5P.jQuery);
