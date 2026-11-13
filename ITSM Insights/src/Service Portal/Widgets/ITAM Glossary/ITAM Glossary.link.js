function link(scope, element) {
  var c = scope.c;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Brings a letter heading or term into view and moves keyboard focus to it
  c.scrollTo = function (id) {
    var target = element[0].querySelector("#" + id);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  };

  scope.$on("$destroy", function () {
    c.scrollTo = null;
  });
}
