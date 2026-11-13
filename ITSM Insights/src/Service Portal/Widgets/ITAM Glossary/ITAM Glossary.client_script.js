api.controller = function ($rootScope, $scope, $timeout, $location) {
  /*
   * Events being $broadcast:
   *   None.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   $locationChangeSuccess - on $rootScope, jumps to the term in &term= when a glossary tooltip link
   *     changes the URL in place. Source: AngularJS $location (links from the itamGlossaryTerms directive).
   *   $destroy - unregisters root-scope listeners. Source: AngularJS scope lifecycle.
   */
  var c = this;
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  c.term = "";
  c.highlight = "";
  c.letters = [];
  c.groups = [];
  c.resultMessage = "";

  function format(template, value) {
    return String(template).replace("{0}", value);
  }

  c.domId = function (kind, value) {
    return "itam-glossary-" + kind + "-" + $scope.$id + "-" + value;
  };

  c.apply = function () {
    var term = (c.term || "").toLowerCase().trim();
    var byLetter = {};
    var count = 0;
    c.groups = [];
    angular.forEach(c.data.terms, function (t) {
      if (term && (t.term + " " + t.text).toLowerCase().indexOf(term) === -1) {
        return;
      }
      if (!byLetter[t.letter]) {
        byLetter[t.letter] = { letter: t.letter, items: [] };
        c.groups.push(byLetter[t.letter]);
      }
      byLetter[t.letter].items.push(t);
      count++;
    });
    c.letters = ALPHABET.split("").map(function (l) {
      return { value: l, enabled: !!byLetter[l] };
    });
    c.count = count;
    c.resultMessage = count === 1 ? c.data.text.shownOne : format(c.data.text.shownMany, count);
  };

  c.clearSearch = function () {
    c.term = "";
    c.apply();
  };

  c.jumpLabel = function (letter) {
    return format(c.data.text.jumpTo, letter);
  };

  // Scroll to and focus an element once the view has updated (scrollTo is set by the link function)
  function goTo(id) {
    $timeout(function () {
      if (c.scrollTo) {
        c.scrollTo(id);
      }
    });
  }

  c.jumpToLetter = function (letter) {
    goTo(c.domId("letter", letter));
  };

  // See also: clear any search that would hide the target, then move to it
  c.jumpToTerm = function (id) {
    if (c.term) {
      c.clearSearch();
    }
    c.highlight = id;
    goTo(c.domId("term", id));
  };

  // Deep link from a glossary tooltip: &term=<sys_id>
  function openRequestedTerm() {
    var id = $location.search().term;
    if (!id) {
      return;
    }
    for (var i = 0; i < c.data.terms.length; i++) {
      if (c.data.terms[i].id === id) {
        c.jumpToTerm(id);
        return;
      }
    }
  }

  var unbindLocation = $rootScope.$on("$locationChangeSuccess", openRequestedTerm);
  $scope.$on("$destroy", unbindLocation);

  c.apply();
  openRequestedTerm();
};
