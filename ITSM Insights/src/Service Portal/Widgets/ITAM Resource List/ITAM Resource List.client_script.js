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
  c.type = "all";
  c.term = "";
  c.visibleTotal = 0;
  c.resultMessage = "";

  function format(template, value) {
    return String(template).replace("{0}", value);
  }

  c.apply = function () {
    var term = (c.term || "").toLowerCase().trim();
    var total = 0;
    angular.forEach(c.data.groups, function (group) {
      group.visible = group.items.filter(function (item) {
        if (c.type !== "all" && item.type !== c.type) {
          return false;
        }
        if (!term) {
          return true;
        }
        return [item.title, item.description, item.audience].join(" ").toLowerCase().indexOf(term) > -1;
      });
      total += group.visible.length;
    });
    c.visibleTotal = total;
    c.resultMessage = total === 1 ? c.data.text.shownOne : format(c.data.text.shownMany, total);
  };

  c.setType = function (value) {
    c.type = value;
    c.apply();
  };

  c.clearSearch = function () {
    c.term = "";
    c.apply();
  };

  c.clearAll = function () {
    c.type = "all";
    c.term = "";
    c.apply();
  };

  c.minutes = function (n) {
    return format(c.data.text.minutes, n);
  };

  c.apply();
};
