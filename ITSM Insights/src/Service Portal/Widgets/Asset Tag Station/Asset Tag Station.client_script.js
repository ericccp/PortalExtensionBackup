api.controller = function ($scope, spUtil) {
  /*
   * Events being $broadcast:
   *   None.
   *
   * Events being $emit:
   *   None.
   *
   * Events being spied $on:
   *   field.change - clears the model when its model category changes (create form and Defaults dropdown). Emitting Widget: sn-record-picker (this widget).
   */
  var c = this;
  var lookupSeq = 0;

  // Code 128 bar/space widths for symbol values 0-106 (106 is the stop pattern)
  var CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
  ];
  var CODE128_START_B = 104;
  var CODE128_START_C = 105;
  var CODE128_STOP = 106;
  var QUIET_ZONE = 10;
  var BARCODE_HEIGHT = 50;

  c.text = c.data.text;
  c.scan = { raw: "" };
  c.state = "idle"; // idle | loading | found | notFound
  c.saving = false;
  c.message = null; // { type: 'success' | 'error' | 'warning', text }

  function ref(name, value, displayValue) {
    return { name: name, value: value || "", displayValue: displayValue || "" };
  }

  function emptyForm() {
    return {
      assignedTo: ref("assigned_to"),
      costCenter: ref("cost_center"),
      location: ref("location"),
      modelCategory: ref("model_category"),
      model: ref("model")
    };
  }

  c.form = emptyForm();

  // Operator defaults (per-user preference) pre-fill the create form's model category and model
  c.defaults = c.data.defaults || { modelCategory: ref("model_category"), model: ref("model") };
  c.defaultsOpen = false;
  c.savingDefaults = false;

  function applyDefaults(form) {
    if (c.defaults.modelCategory.value && !form.modelCategory.value) {
      form.modelCategory = ref("model_category", c.defaults.modelCategory.value, c.defaults.modelCategory.displayValue);
      form.model = ref("model", c.defaults.model.value, c.defaults.model.displayValue);
    }
    return form;
  }

  function formFromAsset(asset) {
    var form = emptyForm();
    form.assignedTo = ref("assigned_to", asset.assignedTo.value, asset.assignedTo.displayValue);
    form.costCenter = ref("cost_center", asset.costCenter.value, asset.costCenter.displayValue);
    form.location = ref("location", asset.location.value, asset.location.displayValue);
    return form;
  }

  function format(template, value) {
    // Function replacement so "$" in values (e.g. "$&") is inserted literally
    return String(template || "").replace("{0}", function () {
      return String(value);
    });
  }

  // Even-length all-digit values use set C (two digits per symbol, wider bars); everything else uses set B
  function code128Values(value) {
    var codes = [];
    var i;
    if (/^\d+$/.test(value) && value.length >= 4 && value.length % 2 === 0) {
      codes.push(CODE128_START_C);
      for (i = 0; i < value.length; i += 2) {
        codes.push(parseInt(value.substr(i, 2), 10));
      }
      return codes;
    }
    codes.push(CODE128_START_B);
    for (i = 0; i < value.length; i++) {
      var code = value.charCodeAt(i) - 32;
      if (code < 0 || code > 95) {
        return null;
      }
      codes.push(code);
    }
    return codes;
  }

  // Encodes printable ASCII as Code 128; returns null when a character can't be encoded
  function encodeCode128(value) {
    var codes = code128Values(value);
    if (!codes) {
      return null;
    }
    var checksum = codes[0];
    for (var i = 1; i < codes.length; i++) {
      checksum += codes[i] * i;
    }
    codes.push(checksum % 103);
    codes.push(CODE128_STOP);

    var bars = [];
    var x = QUIET_ZONE;
    for (var j = 0; j < codes.length; j++) {
      var pattern = CODE128_PATTERNS[codes[j]];
      for (var k = 0; k < pattern.length; k++) {
        var width = parseInt(pattern.charAt(k), 10);
        // Even positions are bars, odd positions are spaces
        if (k % 2 === 0) {
          bars.push({ x: x, w: width });
        }
        x += width;
      }
    }
    return { bars: bars, width: x + QUIET_ZONE, height: BARCODE_HEIGHT };
  }

  // The link function renders these lines into the preview and the printed label
  function buildTag(serial, organization) {
    var phone = c.data.tag.contactPhone;
    return {
      serial: serial,
      ownerLine: organization ? format(c.text.tagOwnerLine, organization) : "",
      serialLine: format(c.text.tagSerialLine, serial),
      contactLine: phone ? format(c.text.tagContactLine, phone) : "",
      barcode: encodeCode128(serial),
      ariaLabel: format(c.text.barcodeAlt, serial)
    };
  }

  function showResult(asset, matchCount) {
    c.asset = asset;
    c.serial = asset.serialNumber;
    c.form = formFromAsset(asset);
    c.tag = buildTag(asset.serialNumber, asset.organization);
    c.state = "found";
    if (matchCount > 1) {
      c.message = { type: "warning", text: format(c.text.duplicateWarning, matchCount) };
    }
  }

  function focusScan() {
    if (c.focusScan) {
      c.focusScan();
    }
  }

  c.lookup = function () {
    var raw = String(c.scan.raw || "");
    if (!raw.replace(/\s/g, "")) {
      c.message = { type: "error", text: c.text.emptySerial };
      focusScan();
      return;
    }
    var seq = ++lookupSeq;
    c.state = "loading";
    c.message = null;
    c.asset = null;
    c.tag = null;
    c.pendingSerial = raw.split(",")[0].replace(/^\s+|\s+$/g, "");

    c.server
      .get({ action: "lookup", raw: raw })
      .then(function (response) {
        // A newer scan has already started; drop this response
        if (seq !== lookupSeq) {
          return;
        }
        var result = response.data.result || {};
        if (!result.success) {
          c.state = "idle";
          c.message = { type: "error", text: result.message || c.text.lookupError };
          return;
        }
        c.scan.raw = result.serial;
        if (result.found) {
          showResult(result.asset, result.matchCount);
        } else {
          c.serial = result.serial;
          c.form = applyDefaults(emptyForm());
          c.tag = buildTag(result.serial, result.organization);
          c.state = "notFound";
        }
      }, function () {
        if (seq === lookupSeq) {
          c.state = "idle";
          c.message = { type: "error", text: c.text.lookupError };
        }
      })
      .finally(function () {
        if (seq === lookupSeq) {
          focusScan();
        }
      });
  };

  c.isDirty = function () {
    if (c.state !== "found" || !c.asset) {
      return false;
    }
    return (
      c.form.assignedTo.value !== c.asset.assignedTo.value ||
      c.form.costCenter.value !== c.asset.costCenter.value ||
      c.form.location.value !== c.asset.location.value
    );
  };

  c.canCreate = function () {
    return !!(c.form.modelCategory.value && c.form.model.value) && !c.saving;
  };

  // Limits a model picker to models in the chosen category
  c.modelQuery = function (categoryField) {
    var category = (categoryField || c.form.modelCategory).value;
    return category ? "cmdb_model_categoryLIKE" + category : "sys_idISEMPTY";
  };

  c.toggleDefaults = function () {
    if (c.defaultsOpen) {
      c.closeDefaults();
      return;
    }
    c.defaultsForm = {
      modelCategory: ref("model_category", c.defaults.modelCategory.value, c.defaults.modelCategory.displayValue),
      model: ref("model", c.defaults.model.value, c.defaults.model.displayValue)
    };
    c.defaultsError = "";
    c.defaultsOpen = true;
    if (c.focusDefaultsPanel) {
      c.focusDefaultsPanel();
    }
  };

  c.closeDefaults = function () {
    if (!c.defaultsOpen) {
      return;
    }
    c.defaultsOpen = false;
    if (c.focusDefaultsToggle) {
      c.focusDefaultsToggle();
    }
  };

  function persistDefaults(categoryId, modelId) {
    c.savingDefaults = true;
    c.defaultsError = "";
    c.server
      .get({ action: "saveDefaults", modelCategory: categoryId, model: modelId })
      .then(function (response) {
        var result = response.data.result || {};
        if (!result.success) {
          c.defaultsError = result.message || c.text.defaultsError;
          return;
        }
        c.defaults = result.defaults;
        // An open create form that has no category yet picks up the new defaults
        if (c.state === "notFound") {
          applyDefaults(c.form);
        }
        c.message = { type: "success", text: result.message };
        c.closeDefaults();
      }, function () {
        c.defaultsError = c.text.defaultsError;
      })
      .finally(function () {
        c.savingDefaults = false;
      });
  }

  c.saveDefaults = function () {
    if (c.savingDefaults) {
      return;
    }
    persistDefaults(c.defaultsForm.modelCategory.value, c.defaultsForm.model.value);
  };

  c.clearDefaults = function () {
    if (c.savingDefaults) {
      return;
    }
    persistDefaults("", "");
  };

  c.resetForm = function () {
    if (c.asset) {
      c.form = formFromAsset(c.asset);
    }
  };

  c.save = function () {
    if (c.saving) {
      return;
    }
    var creating = c.state === "notFound";
    if (creating && !c.canCreate()) {
      c.message = { type: "error", text: c.text.missingModel };
      return;
    }
    c.saving = true;
    c.message = null;
    c.server
      .get({
        action: "save",
        sysId: creating ? "" : c.asset.sysId,
        serial: c.serial,
        model: c.form.model.value,
        modelCategory: c.form.modelCategory.value,
        fields: {
          assignedTo: c.form.assignedTo.value,
          costCenter: c.form.costCenter.value,
          location: c.form.location.value
        }
      })
      .then(function (response) {
        var result = response.data.result || {};
        if (!result.success) {
          c.message = { type: "error", text: result.message || c.text.saveError };
          return;
        }
        showResult(result.asset, 1);
        c.message = { type: "success", text: result.message };
        spUtil.addInfoMessage(result.message);
      }, function () {
        c.message = { type: "error", text: c.text.saveError };
      })
      .finally(function () {
        c.saving = false;
      });
  };

  c.print = function () {
    if (!c.tag || !c.tag.barcode || !c.printTag) {
      return;
    }
    c.printTag(c.tag, c.data.tag);
  };

  c.canClear = function () {
    return !!c.scan.raw || !!c.message || c.state !== "idle";
  };

  // Clear and Scan Next both reset the field, the result and any unsaved form values
  c.clearScan = function () {
    c.scanNext();
  };

  c.scanNext = function () {
    lookupSeq++;
    c.scan.raw = "";
    c.state = "idle";
    c.message = null;
    c.asset = null;
    c.tag = null;
    c.serial = "";
    c.form = emptyForm();
    focusScan();
  };

  $scope.$on("field.change", function (event, params) {
    if (!params || params.newValue === params.oldValue) {
      return;
    }
    if (params.field === c.form.modelCategory) {
      c.form.model = ref("model");
    } else if (c.defaultsForm && params.field === c.defaultsForm.modelCategory) {
      c.defaultsForm.model = ref("model");
    }
  });
};
