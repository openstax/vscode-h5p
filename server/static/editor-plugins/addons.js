// https://h5p.org/adding-text-editor-buttons

function getFixMathTypeDialog() {
  let offsetTop = 0;
  let viewportHeight = 0;
  let parentOffsetTop = 0;
  let parentWidth = 0;
  let parentHeight = 0;
  let mathTypeInstances = [];
  let waitingForUpdate = false;

  const setMathTypePosition = () => {
    const visibleInstances = mathTypeInstances.filter(
      (editor) => !editor.classList.contains('wrs_closed')
    );
    if (waitingForUpdate || visibleInstances.length === 0) return;
    waitingForUpdate = true;
    requestAnimationFrame(() => {
      try {
        const boundingRects = visibleInstances
          .map((dialog) => dialog.getBoundingClientRect())
        const instanceHeights = boundingRects.map((rect) => rect.height)
        const totalHeight = instanceHeights
          .reduce((ax, x) => ax + x);
        const startingOffsetTop =
          offsetTop - parentOffsetTop + viewportHeight / 2 - totalHeight / 2;
        let relOffsetTop = 0;
        visibleInstances.forEach((dialog, idx) => {
          const dialogWidth = boundingRects[idx].width;
          const top = Math.min(
            Math.max(startingOffsetTop, 0), parentHeight - totalHeight
          ) + relOffsetTop;
          const left = Math.max((parentWidth / 2 - dialogWidth / 2), 0);
          relOffsetTop += instanceHeights[idx];
          dialog.style.inset = `${top}px ${left}px 0px`;
        });
      } catch (e) {
        console.error(e);
      } finally {
        waitingForUpdate = false;
      }
    });
  }

  const isMathTypeNode = (node) =>
    node.id === 'wrs_code' ||
    node.classList?.contains('wrs_modal_dialogContainer') === true
  const observe = new MutationObserver(function (mutations) {
    const addedOrRemovedDialog = mutations.some(
      (mutation) =>
        Array.from(mutation.addedNodes).some(isMathTypeNode) ||
        Array.from(mutation.removedNodes).some(isMathTypeNode)
    );
    const shouldUpdate = addedOrRemovedDialog || (
      mathTypeInstances.length > 0 &&
      // Look for cases where a dialog was resized or hidden
      mutations
        .some((mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mathTypeInstances.some((instance) => mutation.target === instance)
        )
    );
    if (addedOrRemovedDialog) {
      mathTypeInstances = Array.from(
        document.querySelectorAll('#wrs_code, .wrs_modal_dialogContainer')
      );
    }
    // Move the dialogs when they are added, hidden/removed, or resized
    if (shouldUpdate) {
      setMathTypePosition();
    }
  });

  observe.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  return function(e) {
    offsetTop = e.detail.parentViewport.pageTop;
    viewportHeight = e.detail.parentViewport.height;
    parentOffsetTop =
      e.detail.boundingClientRect.top + e.detail.parentViewport.pageTop;
    parentWidth = e.detail.boundingClientRect.width;
    parentHeight = e.detail.boundingClientRect.height;
    setMathTypePosition();
  }
}

(function ($) {
  $(document).ready(function () {
    if (!window.CKEDITOR) {
      return;
    }
    document.addEventListener('viewportUpdate', getFixMathTypeDialog())

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
