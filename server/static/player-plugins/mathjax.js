// https://h5p.org/adding-text-editor-buttons

(function ($) {
  $(document).ready(function () {
    if (!window.H5P) {
      return;
    }

    const mathJaxURL =
      'https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-MML-AM_CHTML';
    const hasMath = !!document.querySelector('math');
    const hasMathJax = !!document.querySelector(`script[src="${mathJaxURL}"]`);
    if (hasMath && !hasMathJax) {
      const mathJax = document.createElement('script');
      let observer;
      mathJax.defer = true;
      mathJax.src = mathJaxURL;
      document.head.appendChild(mathJax);
      if (H5P.MultiChoice) {
        observer = new MutationObserver(function (mutations) {
          if (document.querySelector('.h5p-answers .MathJax_Preview')) {
            return;
          }
          const showedCheckButton = mutations.some((mutation) =>
            Array.from(mutation.addedNodes).some((node) =>
              node.className?.includes('h5p-question-check-answer'),
            ),
          );
          if (showedCheckButton) {
            MathJax.Hub.Typeset(document.querySelector('.h5p-answers'));
          }
        });
      }
      if (observer !== undefined) {
        observer.observe(document.querySelector('.h5p-container'), {
          childList: true,
          subtree: true,
        });
      }
    }
  });
})(H5P.jQuery);
