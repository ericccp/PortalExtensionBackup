function link(scope, element) {
  var c = scope.c;
  var doc = element[0].ownerDocument;
  var win = doc.defaultView;
  var CSS_PX_PER_INCH = 96;
  var printFrame = null;
  var focusTimer = null;
  var previewTimer = null;
  var resizeObserver = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function barcodeSvg(barcode) {
    var rects = [];
    for (var i = 0; i < barcode.bars.length; i++) {
      var bar = barcode.bars[i];
      rects.push('<rect x="' + bar.x + '" y="0" width="' + bar.w + '" height="' + barcode.height + '"/>');
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + barcode.width + " " + barcode.height +
      '" preserveAspectRatio="none" shape-rendering="crispEdges">' + rects.join("") + "</svg>"
    );
  }

  // One layout for both the on-screen preview and the printed label, sized in inches:
  // owner line, serial line, barcode filling the remaining height, contact line
  function labelHtml(tag, size) {
    var w = size.widthIn;
    var h = size.heightIn;
    var line = function (cls, text) {
      return text ? '<div class="tag__line ' + cls + '">' + escapeHtml(text) + "</div>" : "";
    };
    return (
      "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + escapeHtml(tag.serial) + "</title><style>" +
      "@page { size: " + w + "in " + h + "in; margin: 0; }" +
      "html, body { margin: 0; padding: 0; background: #fff; overflow: hidden; }" +
      "body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }" +
      ".tag { box-sizing: border-box; width: " + w + "in; height: " + h + "in; padding: " + (h * 0.04).toFixed(3) + "in " + (w * 0.01).toFixed(3) + "in; display: flex; flex-direction: column; align-items: center; overflow: hidden; }" +
      ".tag__line { width: 100%; text-align: center; font-weight: 700; white-space: nowrap; line-height: 1.05; overflow: hidden; }" +
      // Starting sizes; the fit script below shrinks any line that is wider than the label
      ".tag__owner { width: 80%; font-size: " + (h * 13).toFixed(2) + "pt; margin-bottom: " + (h * 0.07).toFixed(3) + "in; }" +
      ".tag__serial { width: 70%; font-size: " + (h * 8.5).toFixed(2) + "pt; }" +
      ".tag__barcode { flex: 1 1 0; min-height: 0; width: 100%; margin: " + (h * 0.01).toFixed(3) + "in 0 " + (h * 0.04).toFixed(3) + "in; }" +
      ".tag__barcode svg { display: block; width: 100%; height: 100%; }" +
      ".tag__contact { font-size: " + (h * 16).toFixed(2) + "pt; }" +
      "</style></head><body><div class=\"tag\">" +
      line("tag__owner", tag.ownerLine) +
      line("tag__serial", tag.serialLine) +
      '<div class="tag__barcode">' + barcodeSvg(tag.barcode) + "</div>" +
      line("tag__contact", tag.contactLine) +
      "</div>" +
      // Shrink any line that is wider than the label until it fits
      "<script>(function(){var l=document.querySelectorAll('.tag__line');for(var i=0;i<l.length;i++){" +
      "var s=parseFloat(window.getComputedStyle(l[i]).fontSize);" +
      "while(l[i].scrollWidth>l[i].clientWidth&&s>4){s-=0.25;l[i].style.fontSize=s+'px';}}})();<\/script>" +
      "</body></html>"
    );
  }

  function writeFrame(frame, html) {
    var frameDoc = frame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
  }

  function removePrintFrame() {
    if (printFrame && printFrame.parentNode) {
      printFrame.parentNode.removeChild(printFrame);
    }
    printFrame = null;
  }

  // Scales the full-size label down (or up) to the width of the preview box
  function scalePreview() {
    var box = element[0].querySelector(".ats__tag-frame");
    var frame = box && box.querySelector("iframe");
    if (!frame || !c.data.tag) {
      return;
    }
    var labelWidth = c.data.tag.widthIn * CSS_PX_PER_INCH;
    var scale = box.clientWidth / labelWidth;
    frame.style.transform = "scale(" + scale + ")";
  }

  function renderPreview() {
    var box = element[0].querySelector(".ats__tag-frame");
    var frame = box && box.querySelector("iframe");
    if (!frame || !c.tag || !c.tag.barcode) {
      return;
    }
    frame.style.width = c.data.tag.widthIn * CSS_PX_PER_INCH + "px";
    frame.style.height = c.data.tag.heightIn * CSS_PX_PER_INCH + "px";
    writeFrame(frame, labelHtml(c.tag, c.data.tag));
    scalePreview();
    if (win.ResizeObserver && !resizeObserver) {
      resizeObserver = new win.ResizeObserver(scalePreview);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver.observe(box);
    }
  }

  // Wait a tick so ng-if has added the preview box before rendering into it
  scope.$watch(
    function () {
      return c.tag;
    },
    function () {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(renderPreview, 0);
    }
  );

  function onWindowResize() {
    scalePreview();
  }

  if (!win.ResizeObserver) {
    win.addEventListener("resize", onWindowResize);
  }

  // Prints through a hidden iframe so popup blockers don't interfere and the portal page is untouched
  c.printTag = function (tag, size) {
    removePrintFrame();
    printFrame = doc.createElement("iframe");
    printFrame.setAttribute("aria-hidden", "true");
    printFrame.setAttribute("tabindex", "-1");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    doc.body.appendChild(printFrame);

    writeFrame(printFrame, labelHtml(tag, size));
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    c.focusScan();
  };

  // Keeps the scan field ready for the next scan, selecting its text so a new scan replaces it
  c.focusScan = function () {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(function () {
      var input = element[0].querySelector(".ats__scan-input");
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  };

  c.focusScan();

  // Defaults dropdown: focus moves into the panel on open and back to the toggle on close
  c.focusDefaultsPanel = function () {
    setTimeout(function () {
      var heading = element[0].querySelector("#ats-defaults-heading");
      if (heading) {
        heading.focus();
      }
    }, 0);
  };

  c.focusDefaultsToggle = function () {
    setTimeout(function () {
      var toggle = element[0].querySelector(".ats__defaults-toggle");
      if (toggle) {
        toggle.focus();
      }
    }, 0);
  };

  function closest(node, selector) {
    while (node && node.nodeType === 1) {
      var matches = node.matches || node.msMatchesSelector;
      if (matches.call(node, selector)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  // sn-record-picker (select2) renders its results list on <body>, so clicks there count as inside
  var INSIDE_DEFAULTS = ".ats__defaults, .select2-drop, .select2-drop-mask, .select2-container";

  function onDocumentPointer(event) {
    if (c.defaultsOpen && !closest(event.target, INSIDE_DEFAULTS)) {
      scope.$evalAsync(function () {
        c.defaultsOpen = false;
      });
    }
  }

  function onDocumentKeydown(event) {
    var isEscape = event.key === "Escape" || event.key === "Esc" || event.keyCode === 27;
    // Let an open select2 list close first; the next Escape closes the dropdown
    if (!isEscape || !c.defaultsOpen || doc.querySelector(".select2-drop-active:not(.select2-display-none)")) {
      return;
    }
    scope.$evalAsync(function () {
      c.closeDefaults();
    });
  }

  // Capture phase so select2 can't swallow the events first
  doc.addEventListener("mousedown", onDocumentPointer, true);
  doc.addEventListener("touchstart", onDocumentPointer, true);
  doc.addEventListener("keydown", onDocumentKeydown, true);

  scope.$on("$destroy", function () {
    doc.removeEventListener("mousedown", onDocumentPointer, true);
    doc.removeEventListener("touchstart", onDocumentPointer, true);
    doc.removeEventListener("keydown", onDocumentKeydown, true);
    clearTimeout(focusTimer);
    clearTimeout(previewTimer);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    win.removeEventListener("resize", onWindowResize);
    removePrintFrame();
  });
}
