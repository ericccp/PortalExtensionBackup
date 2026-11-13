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

  c.percentText = function (value) {
    return String(c.data.text.percentLabel).replace("{0}", value);
  };

  c.emailLabel = function (person) {
    return String(c.data.text.emailPerson).replace("{0}", person.name);
  };
};
