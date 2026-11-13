function link(scope, element) {
  // On narrow screens the tab strip scrolls; bring the active tab into view once rendered
  var timer = setTimeout(function () {
    var scroller = element[0].querySelector(".itam-nav__scroller");
    var active = element[0].querySelector(".itam-nav__link--active");
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) {
      return;
    }
    scroller.scrollLeft = Math.max(0, active.offsetLeft - 16);
  }, 0);

  scope.$on("$destroy", function () {
    clearTimeout(timer);
  });
}
