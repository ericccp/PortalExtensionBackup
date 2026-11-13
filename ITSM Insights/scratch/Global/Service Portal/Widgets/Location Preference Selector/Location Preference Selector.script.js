(function() {
  var ec = new global.EquipmentCheckout();

  // Display text lives here so labels can be updated in one place
  data.text = {
    // The Empty label option overrides the default, e.g. when nothing selected means a default site
    allLocations: options.empty_label ? gs.getMessage(options.empty_label) : gs.getMessage('All locations'),
    locations: gs.getMessage('Locations'),
    // The Filter label option overrides the default label
    filterLabel: options.filter_label ? gs.getMessage(options.filter_label) : gs.getMessage('Filter assets and users by location'),
    clearAll: gs.getMessage('Clear all'),
    cancel: gs.getMessage('Cancel'),
    save: gs.getMessage('Save'),
    saveError: gs.getMessage('Your locations could not be saved. Please try again.')
  };

  // Embedding widgets pick their own preference and event, so each page keeps its own locations.
  // An embedded widget (from $sp.getWidget) can lose its options on server.get, which saved Site Status
  // Header's selection to device_checkinout.locations and reset it on the next page load. The client
  // sends the name back with the save as a fallback. It's client input either way, so it's restricted
  // to *.locations and can't be used to write any other preference.
  var requestedPref = String(options.preference_name || (input && input.preferenceName) || '');
  var prefName = /^[a-z0-9_]+(\.[a-z0-9_]+)*\.locations$/.test(requestedPref)
    ? requestedPref
    : ec.LOCATION_PREF;
  data.preferenceName = prefName;
  data.locationsEvent = options.event_name || ec.LOCATIONS_CHANGED_EVENT;

  if (input && input.action === 'saveLocations') {
    var ids = cleanLocations(input.locations);
    gs.getUser().savePreference(prefName, ids);
    data.locations = getLocations(ids);
    data.saved = true;
    return;
  }

  if (!input)
    data.locations = getLocations(cleanLocations(gs.getUser().getPreference(prefName)));

  // Keeps only well-formed sys_ids, since the list arrives from the client
  function cleanLocations(ids) {
    return String(ids || '').split(',').filter(function(id) {
      return /^[0-9a-f]{32}$/.test(id);
    }).join(',');
  }

  // Returns { value, displayValue } in the format sn-record-picker expects for multiple selections,
  // keeping only locations that still exist.
  function getLocations(ids) {
    var values = [];
    var names = [];
    if (ids) {
      var namesById = {};
      var loc = new GlideRecord('cmn_location');
      loc.addQuery('sys_id', 'IN', ids);
      loc.query();
      while (loc.next())
        namesById[loc.getUniqueValue()] = loc.getDisplayValue();

      ids.split(',').forEach(function(id) {
        if (namesById[id]) {
          values.push(id);
          names.push(namesById[id]);
        }
      });
    }
    return { value: values.join(','), displayValue: names.join(',') };
  }
})();
