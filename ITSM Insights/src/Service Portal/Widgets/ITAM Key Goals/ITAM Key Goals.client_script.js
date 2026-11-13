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
  c.year = c.data.selectedYear;

  c.setYear = function (year) {
    c.year = year;
  };

  c.inYear = function (goal) {
    return !c.year || goal.fiscalYear === c.year;
  };

  c.percentText = function (goal) {
    return String(c.data.text.percentLabel).replace("{0}", goal.percentComplete);
  };
};
