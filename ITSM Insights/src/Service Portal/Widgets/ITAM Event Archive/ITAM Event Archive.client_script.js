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

  // The newest year starts open
  c.open = {};
  if (c.data.years.length) {
    c.open[c.data.years[0].year] = true;
  }

  c.toggle = function (year) {
    c.open[year] = !c.open[year];
  };

  c.countLabel = function (group) {
    return group.items.length === 1
      ? c.data.text.countOne
      : String(c.data.text.countMany).replace("{0}", group.items.length);
  };
};
