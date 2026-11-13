function itamGlossaryTerms($timeout, itamGlossaryTooltips) {
  /*
   * Usage: <p itam-glossary-terms>{{::text}}</p>
   * Links the first mention of each ITAM glossary term inside the element to a hover/focus
   * tooltip (via the itamGlossaryTooltips factory). Headings, links, buttons, form fields,
   * .sr-only text and anything inside .itam-glossary-skip are left alone.
   *
   * Use it only on one-time bound or static content ({{::x}}, ng-bind-html="::x"): the directive
   * splits text nodes, which a live {{x}} binding would later overwrite.
   * New content added under the element (ng-repeat, ng-if) is decorated as it appears.
   */
  return {
    restrict: "A",
    link: function (scope, element) {
      var root = element[0];
      var observer = null;
      var pending = null;
      var destroyed = false;
      var OBSERVE = { childList: true, subtree: true };

      function run() {
        pending = null;
        if (destroyed) {
          return;
        }
        // Our own DOM changes must not re-trigger the observer
        if (observer) observer.disconnect();
        itamGlossaryTooltips.decorate(root);
        if (observer) observer.observe(root, OBSERVE);
      }

      function schedule() {
        if (!pending && !destroyed) {
          pending = $timeout(run, 50, false);
        }
      }

      itamGlossaryTooltips.load().then(function (ready) {
        if (!ready || destroyed) {
          return;
        }
        if (window.MutationObserver) {
          observer = new MutationObserver(schedule);
        }
        schedule();
      });

      scope.$on("$destroy", function () {
        destroyed = true;
        if (observer) observer.disconnect();
        if (pending) $timeout.cancel(pending);
      });
    },
  };
}
