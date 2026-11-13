(function () {
  var ASSET_TABLE = "alm_hardware";
  var ORG_PROPERTY = "x_1026751_itsm_ins.asset_tag.organization_name";
  var PHONE_PROPERTY = "x_1026751_itsm_ins.asset_tag.contact_phone";
  var SYS_ID_PATTERN = /^[0-9a-f]{32}$/i;
  // Per-operator defaults for the create form, stored as a JSON user preference
  var DEFAULTS_PREFERENCE = "x_1026751_itsm_ins.asset_tag_station.defaults";
  var MAX_SERIAL_LENGTH = 100;

  // Display text lives here so titles and messages can be updated in one place
  data.text = {
    title: options.heading
      ? gs.getMessage(options.heading)
      : gs.getMessage("Asset Tag Station"),
    subtitle: options.subtitle
      ? gs.getMessage(options.subtitle)
      : gs.getMessage(
          "Scan a serial number to review the asset, update it, and print a tag."
        ),
    scanLabel: gs.getMessage("Serial number"),
    scanPlaceholder: gs.getMessage("Scan or type a serial number"),
    scanHint: gs.getMessage(
      "Scanner input is read up to the first comma. Press Enter to search."
    ),
    searchButton: gs.getMessage("Search"),
    clearButton: gs.getMessage("Clear"),
    searching: gs.getMessage("Searching for {0}..."),
    foundHeading: gs.getMessage("Asset Found"),
    notFoundHeading: gs.getMessage("No Asset Found"),
    notFoundMessage: gs.getMessage(
      "No hardware asset has serial number {0}. Fill in the details below to create one."
    ),
    duplicateWarning: gs.getMessage(
      "{0} assets share this serial number. Showing the most recently updated one."
    ),
    serialLabel: gs.getMessage("Serial number"),
    assetTagLabel: gs.getMessage("Asset tag"),
    modelLabel: gs.getMessage("Model"),
    modelCategoryLabel: gs.getMessage("Model category"),
    statusLabel: gs.getMessage("State"),
    substatusLabel: gs.getMessage("Substate"),
    warrantyLabel: gs.getMessage("Warranty expiration"),
    warrantyExpired: gs.getMessage("Expired"),
    assetFunctionLabel: gs.getMessage("Asset function"),
    assignedToLabel: gs.getMessage("Assigned to"),
    costCenterLabel: gs.getMessage("Cost center"),
    locationLabel: gs.getMessage("Location"),
    requiredLabel: gs.getMessage("Required"),
    selectCategoryFirst: gs.getMessage("Select a model category first"),
    saveButton: gs.getMessage("Save Changes"),
    createButton: gs.getMessage("Create Asset"),
    saving: gs.getMessage("Saving..."),
    resetButton: gs.getMessage("Undo Changes"),
    printButton: gs.getMessage("Print Asset Tag"),
    scanNextButton: gs.getMessage("Scan Next"),
    openRecord: gs.getMessage("Open record"),
    savedMessage: gs.getMessage("Asset {0} saved."),
    createdMessage: gs.getMessage("Asset {0} created."),
    unsavedChanges: gs.getMessage(
      "You have unsaved changes. The tag prints the serial number and organization only."
    ),
    readOnlyMessage: gs.getMessage(
      "You can view this asset but don't have permission to update it."
    ),
    noCreateMessage: gs.getMessage(
      "You don't have permission to create hardware assets."
    ),
    tagPreviewLabel: gs.getMessage("Tag Preview"),
    // Printed label lines; {0} is the organization, serial number or contact phone
    tagOwnerLine: gs.getMessage("Property of {0}"),
    tagSerialLine: gs.getMessage("Serial #: {0}"),
    tagContactLine: gs.getMessage("If found, please contact {0}"),
    barcodeAlt: gs.getMessage("Barcode for serial number {0}"),
    barcodeError: gs.getMessage(
      "This serial number contains characters that can't be printed as a barcode."
    ),
    emptySerial: gs.getMessage("Scan or enter a serial number."),
    serialTooLong: gs.getMessage(
      "Serial numbers can be at most {0} characters.",
      [String(MAX_SERIAL_LENGTH)]
    ),
    lookupError: gs.getMessage(
      "The asset could not be looked up. Please try again."
    ),
    saveError: gs.getMessage("The asset could not be saved. Please try again."),
    missingModel: gs.getMessage(
      "Select a model category and model to create the asset."
    ),
    alreadyExists: gs.getMessage(
      "An asset with serial number {0} already exists. Scan it again to update it."
    ),
    notAllowed: gs.getMessage(
      "You don't have permission to make this change."
    ),
    invalidValue: gs.getMessage("One of the selected values is not valid."),
    defaultsButton: gs.getMessage("Defaults"),
    defaultsHeading: gs.getMessage("Defaults for New Assets"),
    defaultsHelp: gs.getMessage(
      "Pre-filled when a scanned serial number isn't found. Saved for you only."
    ),
    defaultsSave: gs.getMessage("Save Defaults"),
    defaultsClear: gs.getMessage("Clear Defaults"),
    defaultsCancel: gs.getMessage("Cancel"),
    defaultsSaved: gs.getMessage("Defaults saved."),
    defaultsCleared: gs.getMessage("Defaults cleared."),
    defaultsError: gs.getMessage(
      "Defaults could not be saved. Please try again."
    ),
    defaultsModelMismatch: gs.getMessage(
      "The default model doesn't belong to the default model category."
    ),
    optionalLabel: gs.getMessage("Optional"),
  };

  // Organization printed on the tag: widget option, then sys_property, then the asset's company
  var configuredOrg =
    String(options.organization_name || "") ||
    String(gs.getProperty(ORG_PROPERTY, "") || "");

  var widthIn = parseFloat(options.tag_width_in);
  var heightIn = parseFloat(options.tag_height_in);
  data.tag = {
    widthIn: widthIn > 0 && widthIn <= 8 ? widthIn : 2,
    heightIn: heightIn > 0 && heightIn <= 8 ? heightIn : 1,
    // Contact phone for the "If found" line: widget option, then sys_property; the line is omitted when empty
    contactPhone:
      String(options.contact_phone || "") ||
      String(gs.getProperty(PHONE_PROPERTY, "") || "")
  };
  data.canCreate = new GlideRecordSecure(ASSET_TABLE).canCreate();

  // Scanners may append extra values ("5g90621v0,aba#9121,33109299"); only the first is the serial
  function parseSerial(raw) {
    return String(raw || "")
      .split(",")[0]
      .replace(/^\s+|\s+$/g, "");
  }

  function validateSerial(serial) {
    if (!serial) {
      return data.text.emptySerial;
    }
    if (serial.length > MAX_SERIAL_LENGTH) {
      return data.text.serialTooLong;
    }
    return "";
  }

  function refValue(gr, field) {
    return {
      value: gr.getValue(field) || "",
      displayValue: gr.getDisplayValue(field) || "",
    };
  }

  function warrantyExpired(gr) {
    var value = gr.getValue("warranty_expiration");
    if (!value) {
      return false;
    }
    return new GlideDate().getValue() > value;
  }

  function shapeAsset(gr) {
    var company = gr.getDisplayValue("company") || "";
    return {
      sysId: gr.getUniqueValue(),
      displayName: gr.getDisplayValue() || "",
      serialNumber: gr.getValue("serial_number") || "",
      assetTag: gr.getValue("asset_tag") || "",
      model: gr.getDisplayValue("model") || "",
      modelCategory: gr.getDisplayValue("model_category") || "",
      status: gr.getDisplayValue("install_status") || "",
      substatus: gr.getDisplayValue("substatus") || "",
      assetFunction: gr.getDisplayValue("asset_function") || "",
      warrantyExpiration: gr.getDisplayValue("warranty_expiration") || "",
      warrantyExpired: warrantyExpired(gr),
      assignedTo: refValue(gr, "assigned_to"),
      costCenter: refValue(gr, "cost_center"),
      location: refValue(gr, "location"),
      organization: configuredOrg || company,
      canWrite: gr.canWrite(),
      url: "/" + ASSET_TABLE + ".do?sys_id=" + gr.getUniqueValue(),
    };
  }

  // Reference inputs must be empty or a sys_id that exists on the target table
  function validReference(table, value) {
    if (!value) {
      return true;
    }
    if (!SYS_ID_PATTERN.test(value)) {
      return false;
    }
    var gr = new GlideRecord(table);
    return gr.get(value);
  }

  function readEditableFields(fields) {
    fields = fields || {};
    var values = {
      assigned_to: String(fields.assignedTo || ""),
      cost_center: String(fields.costCenter || ""),
      location: String(fields.location || ""),
    };
    var valid =
      validReference("sys_user", values.assigned_to) &&
      validReference("cmn_cost_center", values.cost_center) &&
      validReference("cmn_location", values.location);
    return valid ? values : null;
  }

  function applyFields(gr, values) {
    for (var field in values) {
      if (values.hasOwnProperty(field)) {
        gr.setValue(field, values[field]);
      }
    }
  }

  function lookup(serial) {
    var gr = new GlideRecordSecure(ASSET_TABLE);
    gr.addQuery("serial_number", serial);
    gr.orderByDesc("sys_updated_on");
    gr.query();
    var count = gr.getRowCount();
    if (!gr.next()) {
      return {
        success: true,
        found: false,
        serial: serial,
        organization: configuredOrg,
      };
    }
    return {
      success: true,
      found: true,
      serial: serial,
      matchCount: count,
      asset: shapeAsset(gr),
    };
  }

  function updateAsset(sysId, values) {
    var gr = new GlideRecordSecure(ASSET_TABLE);
    if (!SYS_ID_PATTERN.test(sysId) || !gr.get(sysId)) {
      return { success: false, message: data.text.saveError };
    }
    if (!gr.canWrite()) {
      return { success: false, message: data.text.notAllowed };
    }
    applyFields(gr, values);
    if (!gr.update()) {
      return { success: false, message: data.text.saveError };
    }
    gr.get(sysId);
    return {
      success: true,
      message: gs.getMessage("Asset {0} saved.", [gr.getDisplayValue()]),
      asset: shapeAsset(gr),
    };
  }

  function createAsset(serial, values, model, modelCategory) {
    if (!data.canCreate) {
      return { success: false, message: data.text.noCreateMessage };
    }
    if (
      !SYS_ID_PATTERN.test(model) ||
      !SYS_ID_PATTERN.test(modelCategory) ||
      !validReference("cmdb_model", model) ||
      !validReference("cmdb_model_category", modelCategory)
    ) {
      return { success: false, message: data.text.missingModel };
    }
    // Re-check so a second scan or double submit can't create a duplicate
    var existing = new GlideRecord(ASSET_TABLE);
    existing.addQuery("serial_number", serial);
    existing.setLimit(1);
    existing.query();
    if (existing.hasNext()) {
      return {
        success: false,
        message: gs.getMessage(
          "An asset with serial number {0} already exists. Scan it again to update it.",
          [serial]
        ),
      };
    }

    // The platform refuses alm_hardware creates from this scope, so the insert runs in the
    // global-scope helper (asset-tag-global project); it uses GlideRecordSecure, so ACLs still apply
    var sysId = new global.AssetTagStationCreator().createHardware({
      serial_number: serial,
      model_category: modelCategory,
      model: model,
      assigned_to: values.assigned_to,
      cost_center: values.cost_center,
      location: values.location
    });
    var gr = new GlideRecordSecure(ASSET_TABLE);
    if (!sysId || !gr.get(sysId)) {
      return { success: false, message: data.text.saveError };
    }
    return {
      success: true,
      message: gs.getMessage("Asset {0} created.", [gr.getDisplayValue()]),
      asset: shapeAsset(gr),
    };
  }

  if (input && input.action === "lookup") {
    var serial = parseSerial(input.raw);
    var serialError = validateSerial(serial);
    if (serialError) {
      data.result = { success: false, message: serialError };
      return;
    }
    try {
      data.result = lookup(serial);
    } catch (e) {
      gs.error("Asset Tag Station: lookup failed for " + serial + ": " + e);
      data.result = { success: false, message: data.text.lookupError };
    }
    return;
  }

  function emptyRef() {
    return { value: "", displayValue: "" };
  }

  function lookupRef(table, sysId, displayField) {
    if (!SYS_ID_PATTERN.test(sysId)) {
      return null;
    }
    var gr = new GlideRecord(table);
    if (!gr.get(sysId)) {
      return null;
    }
    return { value: sysId, displayValue: gr.getValue(displayField) || gr.getDisplayValue() };
  }

  function modelInCategory(modelId, categoryId) {
    var model = new GlideRecord("cmdb_model");
    return model.get(modelId) && String(model.getValue("cmdb_model_category") || "").indexOf(categoryId) > -1;
  }

  // Unknown or deleted records in the saved preference are dropped silently
  function loadDefaults() {
    var defaults = { modelCategory: emptyRef(), model: emptyRef() };
    var saved;
    try {
      saved = JSON.parse(String(gs.getUser().getPreference(DEFAULTS_PREFERENCE) || "{}"));
    } catch (e) {
      return defaults;
    }
    var category = lookupRef("cmdb_model_category", String(saved.modelCategory || ""), "name");
    if (!category) {
      return defaults;
    }
    defaults.modelCategory = category;
    var model = lookupRef("cmdb_model", String(saved.model || ""), "display_name");
    if (model && modelInCategory(model.value, category.value)) {
      defaults.model = model;
    }
    return defaults;
  }

  function saveDefaults(categoryId, modelId) {
    var clearing = !categoryId && !modelId;
    if (!clearing) {
      if (!lookupRef("cmdb_model_category", categoryId, "name")) {
        return { success: false, message: data.text.invalidValue };
      }
      if (modelId && !(lookupRef("cmdb_model", modelId, "display_name") && modelInCategory(modelId, categoryId))) {
        return { success: false, message: data.text.defaultsModelMismatch };
      }
    }
    gs.getUser().savePreference(
      DEFAULTS_PREFERENCE,
      JSON.stringify({ modelCategory: categoryId, model: modelId })
    );
    return {
      success: true,
      message: clearing ? data.text.defaultsCleared : data.text.defaultsSaved,
      defaults: loadDefaults()
    };
  }

  if (!input) {
    data.defaults = loadDefaults();
  }

  if (input && input.action === "saveDefaults") {
    try {
      data.result = saveDefaults(
        String(input.modelCategory || ""),
        String(input.model || "")
      );
    } catch (e) {
      gs.error("Asset Tag Station: saving defaults failed: " + e);
      data.result = { success: false, message: data.text.defaultsError };
    }
    return;
  }

  if (input && input.action === "save") {
    var values = readEditableFields(input.fields);
    if (!values) {
      data.result = { success: false, message: data.text.invalidValue };
      return;
    }
    try {
      if (input.sysId) {
        data.result = updateAsset(String(input.sysId), values);
      } else {
        var newSerial = parseSerial(input.serial);
        var newSerialError = validateSerial(newSerial);
        data.result = newSerialError
          ? { success: false, message: newSerialError }
          : createAsset(
              newSerial,
              values,
              String(input.model || ""),
              String(input.modelCategory || "")
            );
      }
    } catch (e) {
      gs.error("Asset Tag Station: save failed: " + e);
      data.result = { success: false, message: data.text.saveError };
    }
    return;
  }
})();
