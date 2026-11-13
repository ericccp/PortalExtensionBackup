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
  c.status = "";
  c.rows = c.data.matrix.departments;
  c.resultMessage = "";

  function hasStatus(dept, status) {
    for (var i = 0; i < dept.cells.length; i++) {
      if (dept.cells[i] && dept.cells[i].status === status) {
        return true;
      }
    }
    return false;
  }

  c.apply = function () {
    var term = (c.term || "").toLowerCase().trim();
    c.rows = c.data.matrix.departments.filter(function (dept) {
      if (term && dept.name.toLowerCase().indexOf(term) === -1) {
        return false;
      }
      return !c.status || hasStatus(dept, c.status);
    });
    c.resultMessage =
      c.rows.length === 1
        ? c.data.text.shownOne
        : String(c.data.text.shownMany).replace("{0}", c.rows.length);
  };

  c.setStatus = function (value) {
    c.status = c.status === value ? "" : value;
    c.apply();
  };

  c.clearSearch = function () {
    c.term = "";
    c.apply();
  };

  c.clearAll = function () {
    c.term = "";
    c.status = "";
    c.apply();
  };

  // With a status filter on, other cells fade back so matching cells stand out
  c.isDimmed = function (cell) {
    return !!c.status && (!cell || cell.status !== c.status);
  };

  c.apply();
};
