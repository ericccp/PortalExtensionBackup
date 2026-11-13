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

  // Policies open their key points by default; standards start collapsed
  c.open = {};
  angular.forEach(c.data.docs, function (doc) {
    c.open[doc.id] = doc.type === "policy";
  });

  c.toggle = function (doc) {
    c.open[doc.id] = !c.open[doc.id];
  };
};
