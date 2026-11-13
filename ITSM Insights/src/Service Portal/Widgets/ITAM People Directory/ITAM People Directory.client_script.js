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
  c.letter = "";

  function format(template, value) {
    return String(template).replace("{0}", value);
  }

  c.setLetter = function (letter) {
    c.letter = c.letter === letter ? "" : letter;
  };

  c.visible = function () {
    if (!c.letter) {
      return c.data.people;
    }
    return c.data.people.filter(function (p) {
      return p.letter === c.letter;
    });
  };

  c.countLabel = function () {
    var n = c.data.people.length;
    return n === 1 ? c.data.text.countOne : format(c.data.text.countMany, n);
  };

  c.shownLabel = function () {
    var n = c.visible().length;
    return n === 1 ? c.data.text.shownOne : format(c.data.text.shownMany, n);
  };

  c.letterLabel = function (letter) {
    return format(c.data.text.letterFilter, letter);
  };

  c.emailLabel = function (person) {
    return format(c.data.text.emailPerson, person.name);
  };
};
