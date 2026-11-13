api.controller = function () {
  /*
   * Events being $broadcast:
   *   None.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   None.
   */
  var c = this;
  c.term = "";
  c.open = {};
  c.visibleTotal = 0;
  c.resultMessage = "";

  c.apply = function () {
    var term = (c.term || "").toLowerCase().trim();
    var total = 0;
    angular.forEach(c.data.groups, function (group) {
      group.visible = group.items.filter(function (item) {
        return !term || (item.question + " " + item.text).toLowerCase().indexOf(term) > -1;
      });
      total += group.visible.length;
    });
    c.visibleTotal = total;
    c.resultMessage =
      total === 1 ? c.data.text.shownOne : String(c.data.text.shownMany).replace("{0}", total);
  };

  c.toggle = function (item) {
    c.open[item.id] = !c.open[item.id];
  };

  c.allOpen = function () {
    var all = c.visibleTotal > 0;
    angular.forEach(c.data.groups, function (group) {
      angular.forEach(group.visible, function (item) {
        if (!c.open[item.id]) {
          all = false;
        }
      });
    });
    return all;
  };

  c.toggleAll = function () {
    var open = !c.allOpen();
    angular.forEach(c.data.groups, function (group) {
      angular.forEach(group.visible, function (item) {
        c.open[item.id] = open;
      });
    });
  };

  c.clearSearch = function () {
    c.term = "";
    c.apply();
  };

  c.apply();
};
