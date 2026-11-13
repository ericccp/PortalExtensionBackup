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
  c.showResolved = false;
  c.expanded = {};

  function format(template, value) {
    return String(template).replace("{0}", value);
  }

  c.visible = function (issue) {
    return !issue.resolvedFlag || c.showResolved;
  };

  c.toggle = function (issue) {
    c.expanded[issue.id] = !c.expanded[issue.id];
  };

  c.toggleResolved = function () {
    c.showResolved = !c.showResolved;
  };

  c.resolvedLabel = function () {
    return c.showResolved ? c.data.text.hideResolved : format(c.data.text.showResolved, c.data.resolvedCount);
  };

  c.openCountLabel = function () {
    return c.data.openCount === 1 ? c.data.text.openCountOne : format(c.data.text.openCountMany, c.data.openCount);
  };
};
