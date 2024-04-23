// https://h5p.org/adding-text-editor-buttons

class ViewportUpdateHandler {
  constructor(getVisibleElements) {
    this.offsetTop = 0;
    this.viewportHeight = 0;
    this.parentOffsetTop = 0;
    this.parentWidth = 0;
    this.parentHeight = 0;
    this.isUpdatePending = false;
    this.getVisibleElements = getVisibleElements;
  }

  update() {
    if (this.isUpdatePending) return;
    const visibleElms = this.getVisibleElements();
    if (visibleElms.length === 0) return;
    
    this.isUpdatePending = true;
    // TODO: Maybe tile dialogs horizontally too if needed
    const boundingRects = visibleElms.map((elm) => elm.getBoundingClientRect());
    const instanceHeights = boundingRects.map((rect) => rect.height);
    const totalHeight = instanceHeights.reduce((ax, x) => ax + x);
    const startingOffsetTop = (
      this.offsetTop -
      this.parentOffsetTop +
      this.viewportHeight / 2 -
      totalHeight / 2
    );
    requestAnimationFrame(() => {
      try {
        let relOffsetTop = 0;
        visibleElms.forEach((dialog, idx) => {
          const rect = boundingRects[idx];
          const dialogWidth = rect.width;
          const top = Math.min(
            Math.max(startingOffsetTop, 0), this.parentHeight - totalHeight
          ) + relOffsetTop;
          const left = Math.max((this.parentWidth / 2 - dialogWidth / 2), 0);
          relOffsetTop += rect.height;
          dialog.style.inset = `${top}px ${left}px 0px`;
        });
      } catch (e) {
        console.error(e);
      } finally {
        this.isUpdatePending = false;
      }
    });
  }

  _update(e) {
    this.offsetTop = e.detail.parentViewport.pageTop;
    this.viewportHeight = e.detail.parentViewport.height;
    this.parentOffsetTop =
      e.detail.boundingClientRect.top + e.detail.parentViewport.pageTop;
    this.parentWidth = e.detail.boundingClientRect.width;
    this.parentHeight = e.detail.boundingClientRect.height;
    this.update();
  }

  installListener() {
    document.addEventListener('viewportUpdate', this._update.bind(this));
    return this;
  }
}

class MathTypeInstanceHandler {
  constructor() {
    this._instances = [];
    this._observer = undefined;
  }

  get instances() {
    return this._instances;
  }
  
  get visibleInstances() {
    return this._instances.filter(
      (editor) => !editor.classList.contains('wrs_closed')
    );
  }

  installObserver(root, onUpdate) {
    if (this._observer !== undefined) {
      throw new Error('Observer already installed')
    }
    const isMathTypeNode = (node) =>
      node.id === 'wrs_code' ||
      node.classList?.contains('wrs_modal_dialogContainer') === true
    const observer = new MutationObserver((mutations) => {
      const addedOrRemovedDialog = mutations.some(
        (mutation) =>
          Array.from(mutation.addedNodes).some(isMathTypeNode) ||
          Array.from(mutation.removedNodes).some(isMathTypeNode)
      );
      if (addedOrRemovedDialog) {
        this._instances = Array.from(
          root.querySelectorAll('#wrs_code, .wrs_modal_dialogContainer')
        );
      }
      // Call onUpdate when dialogs are added, hidden/removed, or resized
      if (
        addedOrRemovedDialog || (
          this._instances.length > 0 &&
          // Look for cases where a dialog was resized or hidden
          mutations.some((mutation) =>
            mutation.type === 'attributes' &&
            mutation.attributeName === 'class' &&
            this._instances.some(
              (instance) => mutation.target === instance
            )
          )
        )
      ) {
        onUpdate();
      }
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    this._observer = observer;
  }
}

function handleViewportUpdates() {
  const mathTypeInstanceHandler = new MathTypeInstanceHandler();
  const viewportUpdateHandler = new ViewportUpdateHandler(
    // Add more elements as needed (concat arrays together)
    () => mathTypeInstanceHandler.visibleInstances
  );
  const update = viewportUpdateHandler.update.bind(viewportUpdateHandler);
  viewportUpdateHandler.installListener();
  mathTypeInstanceHandler.installObserver(document.body, update);
}

(function ($) {
  $(document).ready(function () {
    if (!window.CKEDITOR) {
      return;
    }
    handleViewportUpdates();

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
