function itamGlossaryTooltips($http, $document, $window) {
  /*
   * Shared by every widget that uses the itamGlossaryTerms directive.
   * - load(): fetches the glossary index once per session (later calls reuse the promise).
   * - decorate(root): links the first mention of each term inside root.
   * One tooltip element, one store of screen-reader descriptions and one set of delegated
   * document listeners are created the first time terms load. They live for the whole portal
   * session because this factory is a singleton, so they are not removed per widget.
   */
  var ENDPOINT = "/api/x_1026751_itsm_ins/itam_portal/glossary_terms";
  var SKIP_TAGS = /^(A|BUTTON|INPUT|TEXTAREA|SELECT|OPTION|LABEL|SCRIPT|STYLE|CODE|PRE|H1|H2|H3|H4|H5|H6|SVG)$/;
  var SKIP_CLASSES = ["itam-gloss", "sr-only", "itam-glossary-skip"];
  var STYLE = [
    ".itam-gloss{color:inherit;text-decoration:none;border-bottom:1px dotted currentColor;cursor:pointer}",
    ".itam-gloss:hover,.itam-gloss:focus{color:inherit;text-decoration:none;border-bottom-style:solid}",
    ".itam-gloss:focus-visible{outline:2px solid #0080a3;outline-offset:2px;border-radius:2px}",
    "#itam-gloss-tip{position:fixed;z-index:1100;display:none;max-width:320px;padding:12px 14px;border-radius:8px;",
    "background:#10171a;color:#fff;font-size:13px;line-height:1.5;text-align:left;box-shadow:0 6px 18px rgba(0,0,0,.22)}",
    "#itam-gloss-tip.itam-gloss-tip--open{display:block}",
    "#itam-gloss-tip .itam-gloss-tip__term{display:block;margin-bottom:4px;font-size:14px;font-weight:600}",
    "#itam-gloss-tip .itam-gloss-tip__hint{display:block;margin-top:8px;font-size:12px;color:rgba(255,255,255,.78)}",
    "@media print{.itam-gloss{border-bottom:0}}",
  ].join("");

  var doc = $document[0];
  var loading = null;
  var pattern = null;
  var byForm = {};
  var byId = {};
  var glossaryUrl = "";
  var hint = "";
  var tip = null;
  var store = null;
  var hideTimer = null;
  var current = null;

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Acronyms (one word with 2+ capitals, such as CMDB or SaaS) must match case exactly
  function isExact(form) {
    return form.indexOf(" ") === -1 && (form.match(/[A-Z]/g) || []).length >= 2;
  }

  function build(result) {
    var terms = (result && result.terms) || [];
    var forms = [];
    glossaryUrl = (result && result.glossaryUrl) || "";
    hint = (result && result.labels && result.labels.hint) || "";
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      byId[t.id] = t;
      for (var j = 0; j < (t.forms || []).length; j++) {
        var form = t.forms[j];
        var key = form.toLowerCase();
        if (!byForm[key]) {
          byForm[key] = { id: t.id, form: form, exact: isExact(form) };
          forms.push(form);
        }
      }
    }
    if (!forms.length) {
      return false;
    }
    // Longest first so "IT Asset Management" wins over "IT Asset"
    forms.sort(function (a, b) {
      return b.length - a.length;
    });
    pattern = new RegExp(
      "(^|[^A-Za-z0-9])(" + forms.map(escapeRegExp).join("|") + ")(s?)(?![A-Za-z0-9])",
      "gi"
    );
    return true;
  }

  // ---- Tooltip UI ----
  function closestTerm(node) {
    while (node && node !== doc) {
      if (node.nodeType === 1 && node.classList.contains("itam-gloss")) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function inTip(node) {
    while (node && node !== doc) {
      if (node === tip) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function cancelHide() {
    if (hideTimer) {
      $window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function hide() {
    cancelHide();
    if (tip) {
      tip.classList.remove("itam-gloss-tip--open");
    }
    current = null;
  }

  function scheduleHide() {
    cancelHide();
    hideTimer = $window.setTimeout(hide, 150);
  }

  function show(el) {
    var term = byId[el.getAttribute("data-term")];
    if (!term) {
      return;
    }
    cancelHide();
    current = el;
    tip.innerHTML = "";
    var name = doc.createElement("span");
    name.className = "itam-gloss-tip__term";
    name.textContent = term.term;
    var def = doc.createElement("span");
    def.textContent = term.definition;
    tip.appendChild(name);
    tip.appendChild(def);
    if (hint) {
      var foot = doc.createElement("span");
      foot.className = "itam-gloss-tip__hint";
      foot.textContent = hint;
      tip.appendChild(foot);
    }
    tip.classList.add("itam-gloss-tip--open");

    // Above the term when there is room, otherwise below; kept inside the viewport
    var rect = el.getBoundingClientRect();
    var width = tip.offsetWidth;
    var height = tip.offsetHeight;
    var top = rect.top - height - 8;
    if (top < 8) {
      top = rect.bottom + 8;
    }
    var left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, $window.innerWidth - width - 8));
    tip.style.top = Math.round(top) + "px";
    tip.style.left = Math.round(left) + "px";
  }

  function installUi() {
    if (doc.getElementById("itam-gloss-tip")) {
      tip = doc.getElementById("itam-gloss-tip");
      store = doc.getElementById("itam-gloss-store");
      return;
    }
    var style = doc.createElement("style");
    style.id = "itam-gloss-style";
    style.textContent = STYLE;
    doc.head.appendChild(style);

    // Visual only; screen readers get the definition through aria-describedby on each term
    tip = doc.createElement("div");
    tip.id = "itam-gloss-tip";
    tip.setAttribute("aria-hidden", "true");
    doc.body.appendChild(tip);

    store = doc.createElement("div");
    store.id = "itam-gloss-store";
    store.hidden = true;
    doc.body.appendChild(store);

    doc.addEventListener("mouseover", function (e) {
      var el = closestTerm(e.target);
      if (el) {
        if (el !== current) show(el);
        else cancelHide();
      } else if (inTip(e.target)) {
        cancelHide();
      }
    });
    doc.addEventListener("mouseout", function (e) {
      if (closestTerm(e.target) || inTip(e.target)) {
        scheduleHide();
      }
    });
    doc.addEventListener("focusin", function (e) {
      var el = closestTerm(e.target);
      if (el) show(el);
    });
    doc.addEventListener("focusout", function (e) {
      if (closestTerm(e.target)) hide();
    });
    // Escape dismisses without moving focus (WCAG 1.4.13)
    doc.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.keyCode === 27) && current) hide();
    });
    $window.addEventListener("scroll", hide, true);
    $window.addEventListener("resize", hide);
  }

  function describedBy(term) {
    var id = "itam-gloss-desc-" + term.id;
    if (!doc.getElementById(id)) {
      var span = doc.createElement("span");
      span.id = id;
      span.textContent = term.term + ": " + term.definition;
      store.appendChild(span);
    }
    return id;
  }

  // ---- Decoration ----
  function skipped(node, root) {
    var el = node.parentNode;
    while (el && el !== root.parentNode) {
      if (el.nodeType === 1) {
        if (SKIP_TAGS.test(el.nodeName.toUpperCase()) || el.isContentEditable) {
          return true;
        }
        for (var i = 0; i < SKIP_CLASSES.length; i++) {
          if (el.classList.contains(SKIP_CLASSES[i])) {
            return true;
          }
        }
      }
      el = el.parentNode;
    }
    return false;
  }

  function makeLink(entry, text) {
    var term = byId[entry.id];
    var a = doc.createElement("a");
    a.className = "itam-gloss";
    a.setAttribute("href", glossaryUrl + "&term=" + entry.id);
    a.setAttribute("data-term", entry.id);
    a.setAttribute("aria-describedby", describedBy(term));
    a.textContent = text;
    return a;
  }

  function wrap(node, used) {
    var text = node.nodeValue;
    var pieces = [];
    var last = 0;
    var m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text))) {
      var form = m[2];
      var entry = byForm[form.toLowerCase()];
      if (!entry || used[entry.id] || (entry.exact && form !== entry.form)) {
        continue;
      }
      used[entry.id] = true;
      var start = m.index + m[1].length;
      var end = start + form.length + m[3].length;
      if (start > last) pieces.push(doc.createTextNode(text.substring(last, start)));
      pieces.push(makeLink(entry, text.substring(start, end)));
      last = end;
    }
    if (!pieces.length) {
      return;
    }
    if (last < text.length) pieces.push(doc.createTextNode(text.substring(last)));
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < pieces.length; i++) frag.appendChild(pieces[i]);
    node.parentNode.replaceChild(frag, node);
  }

  function decorate(root) {
    if (!pattern || !root) {
      return;
    }
    // A term already linked in this container is not linked again
    var used = {};
    var existing = root.querySelectorAll(".itam-gloss");
    for (var i = 0; i < existing.length; i++) {
      used[existing[i].getAttribute("data-term")] = true;
    }
    var nodes = [];
    var walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, null, false);
    while (walker.nextNode()) {
      if (/\S/.test(walker.currentNode.nodeValue) && !skipped(walker.currentNode, root)) {
        nodes.push(walker.currentNode);
      }
    }
    for (var j = 0; j < nodes.length; j++) {
      wrap(nodes[j], used);
    }
  }

  function load() {
    if (!loading) {
      loading = $http.get(ENDPOINT).then(
        function (resp) {
          var ready = build(resp.data && resp.data.result);
          if (ready) {
            installUi();
          }
          return ready;
        },
        function () {
          // Tooltips are an enhancement: on failure the text simply stays plain
          return false;
        }
      );
    }
    return loading;
  }

  return {
    load: load,
    decorate: decorate,
  };
}
