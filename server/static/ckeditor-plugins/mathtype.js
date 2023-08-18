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

      // Add math tags (except math since it is already there)
      // Any tags that are not included will be escaped on save
      tags.push(
        // 'math',
        'maction',
        'annotation',
        'annotation-xml',
        'menclose',
        'merror',
        'mfenced',
        'mfrac',
        'mi',
        'mmultiscripts',
        'mn',
        'mo',
        'mover',
        'mpadded',
        'mphantom',
        'mprescripts',
        'mroot',
        'mrow',
        'ms',
        'semantics',
        'mspace',
        'msqrt',
        'mstyle',
        'msub',
        'msup',
        'msubsup',
        'mtable',
        'mtd',
        'mtext',
        'mtr',
        'munder',
        'munderover',
        'math',
        'mi',
        'mn',
        'mo',
        'ms',
        'mspace',
        'mtext',
        'menclose',
        'merror',
        'mfenced',
        'mfrac',
        'mpadded',
        'mphantom',
        'mroot',
        'mrow',
        'msqrt',
        'mstyle',
        'mmultiscripts',
        'mover',
        'mprescripts',
        'msub',
        'msubsup',
        'msup',
        'munder',
        'munderover',
        'mtable',
        'mtd',
        'mtr',
        'maction',
        'annotation',
        'annotation-xml',
        'semantics'
      );
    };
  });
})(H5P.jQuery);
