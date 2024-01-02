// sets base href="<content-path>/" so that images load correctly

function installBaseURL(document, contentId) {
  const head = document.head;
  const href = H5P.getContentPath(contentId) + '/';
  let base = head.querySelector('base');
  if (!base) {
    base = document.createElement('base');
    head.prepend(base);
  }
  if (base.href !== href) {
    base.href = href;
  }
}

(function ($) {
  $(document).ready(function () {
    if (!window.H5P) {
      return;
    }

    const isH5PEditor = window.H5PEditor !== undefined;
    const contentId = isH5PEditor
      ? H5PEditor.contentId
      : H5P.instances[0].contentId;

    if ((contentId ?? '') === '') {
      console.warn('Could not get content id.');
    } else {
      installBaseURL(document, contentId);
      if (isH5PEditor) {
        const observer = new MutationObserver(function () {
          const editorFrame = document.querySelector('.cke_wysiwyg_frame');
          if (editorFrame) {
            installBaseURL(editorFrame.contentDocument, contentId);
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    }
  });
})(H5P.jQuery);
