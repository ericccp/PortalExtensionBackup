(function() {

    if (input && input.action === 'exportAssets') {
        // TODO: Replace this stub with an authorized, server-side asset query.
        // Request: tabId, hardwareTabId, softwareTabId, uiFilters, searchParam,
        // statusFilter, sortOption, isDraftTab. Validate inputs and enforce ACLs.
        // Return data.exportResult = { status: 'ready', rows: [...] } using the
        // same display-value fields as assetData (install_status for Status,
        // software.subscriptionPeriod for software rows).
        // Return every matching row, without the UI pagination limit.
        // Until implemented, the client exports its currently loaded assets.
        data.exportResult = { status: 'not_implemented' };
        return;
    }

    var assetUtil = new global.AssetWidgetUtilsExtension();

    data.showSoftwareUnsubscribe = true;
    data.showReceiveAsset = true;
    data.isManager = assetUtil.isManager();
    data.isCostCenterManager = assetUtil.isCostCenterManager();

    data.hardwareTabId = input && input.hardwareTabId ? input.hardwareTabId : options.hardwareTabId;
    data.softwareTabId = input && input.softwareTabId ? input.softwareTabId : options.softwareTabId;

    data.hardwareRequestUrl = gs.getProperty('asset_request.hardware');
    data.softwareRequestUrl = gs.getProperty('asset_request.software');

    data.uiFilters = input && input.uiFilters ? input.uiFilters : options.uiFilters || {};
    data.tabId = input && input.tabId ? input.tabId : options.tabId;
    data.searchParam = input && input.searchParam !== undefined ? input.searchParam : options.searchParam;
    data.limit = parseInt(input && input.limit ? input.limit : options.limit, 10) || 6;
    data.statusFilter = input && input.statusFilter !== undefined ? input.statusFilter : options.statusFilter;
    data.sortOption = input && input.sortOption !== undefined ? input.sortOption : options.sortOption;
    data.includeSkipLevels = input && input.includeSkipLevels !== undefined ? input.includeSkipLevels : options.includeSkipLevels;

    data.offset = parseInt(input && input.offset ? input.offset : 0, 10) || 0;
    data.view = options.view || 'card';

    data.isHardwareTab = data.tabId == data.hardwareTabId;
    data.isSoftwareTab = data.tabId == data.softwareTabId;

    data.softwareLicesingDisclaimer = gs.getMessage("At this time, only Microsoft and Adobe licenses are displayed. Additional software products will be added throughout the year.");
    data.showMoreButtonText = gs.getMessage("Show more");

    if (input && input.action == 'loadMoreAssets') {
        data.isDraftTab = input.isDraftTab;
        if (data.isHardwareTab) {
            data.nextAssets = assetUtil.getHardwareAssets(
                data.limit,
                data.offset,
                data.searchParam,
                data.uiFilters,
                data.statusFilter,
                data.sortOption,
                data.includeSkipLevels
            );
            data.nextAssetData = applyModelManufacturer(data.nextAssets.data || []);
            data.nextAssetCards = getAssetCardsData(data.nextAssetData);
            data.showMore = data.nextAssets.showMore === true;
            data.offset = data.nextAssets.nextOffset || data.offset;
        } else if (data.isSoftwareTab) {
            data.nextAssets = assetUtil.getSoftwareAssets(
                data.limit,
                data.offset,
                data.searchParam,
                data.sortOption,
                data.uiFilters
            );
            data.nextAssetData = data.nextAssets.data || [];
            data.nextAssetCards = getAssetCardsData(data.nextAssetData);
            data.showMore = data.nextAssets.showMore === true;
            data.offset = data.nextAssets.nextOffset || data.offset;
        } 
        var existingData = input.existingAssetData || [];
        var combinedAssetData = existingData.concat(data.nextAssetData || []);
        data.assetData = combinedAssetData;
    }

    if (!input) {
        if (data.isHardwareTab) {
            data.assetResults = assetUtil.getHardwareAssets(
                data.limit,
                data.offset,
                data.searchParam,
                data.uiFilters,
                data.statusFilter,
                data.sortOption,
                data.includeSkipLevels
            );

            data.assetData = applyModelManufacturer(data.assetResults.data || []);
            data.assetCards = getAssetCardsData(data.assetData);
            data.showMore = data.assetResults.showMore === true;
            data.offset = data.assetResults.nextOffset || data.offset;
            data.lastRenderedCard = data.assetResults.lastRenderedCard;
            data.hasContent = Array.isArray(data.assetData) && data.assetData.length > 0;
            data.isUiFiltersEmpty = Object.keys(data.uiFilters).length === 0 && data.uiFilters.constructor === Object;

            data.emptyTitle = gs.getMessage("No devices found.");
            data.emptyDescription = gs.getMessage("You don't have anything assigned right now.");
            data.emptyIcon = "fa-laptop";
        }

        if (data.isSoftwareTab) {
            data.assetResults = assetUtil.getSoftwareAssets(
                data.limit,
                data.offset,
                data.searchParam,
                data.sortOption,
                data.uiFilters
            )

            data.assetData = data.assetResults.data || [];
            data.assetCards = getAssetCardsData(data.assetData);
            data.showMore = data.assetResults.showMore === true;
            data.offset = data.assetResults.nextOffset || data.offset;

            data.lastRenderedCard = data.assetResults.lastRenderedCard;
            data.hasContent = Array.isArray(data.assetData) && data.assetData.length > 0;

            data.isUiFiltersEmpty = Object.keys(data.uiFilters).length === 0 && data.uiFilters.constructor === Object;

            data.emptyTitle = gs.getMessage("No software licenses found.");
            data.emptyDescription = gs.getMessage("You don't have anything assigned right now.");
            data.emptyIcon = "fa-cloud";
        }

    }

    data.hasContent = Array.isArray(data.assetData) && data.assetData.length > 0;

    if (data.hasContent) {
        data.assetListWidget = getAssetListWidget(data.assetData);
    }

    var statusFilter = String(data.statusFilter || '').toLowerCase().trim();
    data.hasActiveCriteria = !!String(data.searchParam || '').trim() ||
        (data.isHardwareTab && (Object.keys(data.uiFilters).length > 0 ||
            (statusFilter !== '' && statusFilter !== 'default')));
    data.showNewRequest = !data.hasContent && !data.hasActiveCriteria &&
        (data.isHardwareTab || data.isSoftwareTab);

    if (!data.hasContent && data.hasActiveCriteria) {
        data.emptyTitle = gs.getMessage("No results match your criteria.");
        data.emptyDescription = gs.getMessage("Try removing some filters or adjusting your search");
        data.emptyIcon = "fa-times-circle-o";
    }

    function getAssetCardsData(dataResults) {
        var dataPayload = [];

        dataResults.forEach(function(item) {
            var itemPayload = {};
            var widgetName = 'ec-asset-card';

            itemPayload.title = item.title;
            itemPayload.assetTag = item.assetTag ? item.assetTag : '';
            itemPayload.serialNumber = item.serialNumber ? item.serialNumber : '';
            itemPayload.type = item.type ? item.type : '';
            itemPayload.model = item.model;
            itemPayload.unit_cost = item.unit_cost;
            itemPayload.manufacturer = item.manufacturer;
            itemPayload.model_category = item.model_category;
            itemPayload.status = item.install_status;
            itemPayload.subcaption = item.subcaption;
            itemPayload.url = item.url;
            itemPayload.sysID = item.sysID;
            itemPayload.sysClassName = item.sysClassName;
            itemPayload.assigned_to = item.assigned_to;
            itemPayload.assigned_to_sys_id = item.assigned_to_sys_id;
            itemPayload.reserved_for = item.reserved_for;
            itemPayload.reserved_for_sys_id = item.reserved_for_sys_id;
            itemPayload.cost_center = item.cost_center;
            itemPayload.location = item.location;
            itemPayload.asset_function = item.asset_function;
            itemPayload.software = item.software;

            itemPayload.actionConfig = getAssetActions(item);
            var userCanActOnAsset = canCurrentUserActOnAsset(item);

            itemPayload.debugAccess = {
                currentUserId: gs.getUserID(),
                assignedToDisplay: item.assigned_to,
                assignedToSysId: item.assigned_to_sys_id,
                reservedForDisplay: item.reserved_for,
                reservedForSysId: item.reserved_for_sys_id,
                userCanActOnAsset: userCanActOnAsset
            };

            itemPayload.widgetData = $sp.getWidget(widgetName, itemPayload);
            dataPayload.push(itemPayload.widgetData);
        });

        return dataPayload;
    }

    function getAssetActions(item) {
        var UNSUBSCRIBE_URL = '?id=sc_cat_item&sys_id=3105813f3be73ed0a56ac8c5e4e45ab3&entitlement_sys_id=';
        var GET_HELP_URL = '?id=sc_cat_item&sys_id=e85a62ab93e4121055431cbf6489183b&asset_sys_id=';

        var userCanActOnAsset = canCurrentUserActOnAsset(item);
        var actionDisabled = userCanActOnAsset !== true;
        var assetOwnerName = item.assigned_to || item.reserved_for;
        var disabledReason = assetOwnerName ?
            gs.getMessage("Only {0} can perform this action.", [assetOwnerName]) :
            gs.getMessage("Only the assigned or reserved user can perform this action.");

        var actions = [];

        if (item.model_category == 'Software') {
            if (item.unsubscribe_option && data.showSoftwareUnsubscribe) {
                actions.push({
                    label: gs.getMessage("Unsubscribe"),
                    eventName: '',
                    eventPayload: '',
                    url: UNSUBSCRIBE_URL + item.sysID,
                    order: 1,
                    disabled: actionDisabled,
                    disabledReason: disabledReason
                });
            }
        }

        if (item.sysClassName == 'Hardware') {
            if (userCanActOnAsset) {
                actions.push({
                    label: gs.getMessage("Get help"),
                    eventName: '',
                    eventPayload: '',
                    url: GET_HELP_URL + item.sysID,
                    order: 3
                });
            }

            if (item.attest) {
                actions.push({
                    label: gs.getMessage("Confirm"),
                    type: "confirm",
                    eventName: '',
                    eventPayload: '',
                    url: item.attesturl,
                    order: 2,
                    disabled: actionDisabled,
                    disabledReason: disabledReason
                });
            }

            if (item.receive && data.showReceiveAsset) {
                actions.push({
                    label: gs.getMessage("Receive"),
                    type: "receive",
                    eventName: '',
                    eventPayload: '',
                    url: '',
                    order: 1,
                    disabled: actionDisabled,
                    disabledReason: disabledReason
                });
            }
        }

        actions.sort(function(a, b) {
            return a.order - b.order;
        });

        return actions;
    }

    function getAssetListWidget(assetData) {
        var listAssets = (assetData || []).map(function(item) {
            var listItem = {};
            Object.keys(item).forEach(function(key) {
                listItem[key] = item[key];
            });
            listItem.actionConfig = getAssetActions(item);
            return listItem;
        });
        return $sp.getWidget('ec-asset-list-item', {
            assetData: listAssets,
            isDraftTab: data.isDraftTab,
            isSoftwareTab: data.isSoftwareTab,
            draftDeleteEventName: data.isDraftTab ? data.draftDeleteEventName : ''
        });
    }

    // AssetWidgetUtilsExtension leaves manufacturer blank for hardware, so take it
    // from the asset's model (alm_asset.model), falling back to the CI's model_id.
    function applyModelManufacturer(rows) {
        var missing = {};
        var ids = [];
        rows.forEach(function(item) {
            if (!item.manufacturer && item.sysID) {
                missing[item.sysID] = item;
                ids.push(item.sysID);
            }
        });
        if (!ids.length) return rows;

        var found = {};
        var asset = new GlideRecord('alm_asset');
        asset.addQuery('sys_id', 'IN', ids.join(','));
        asset.query();
        while (asset.next()) {
            found[asset.getUniqueValue()] = asset.model.manufacturer.getDisplayValue() ||
                asset.ci.model_id.manufacturer.getDisplayValue();
        }

        var ciIds = ids.filter(function(id) {
            return !found[id];
        });
        if (ciIds.length) {
            var ci = new GlideRecord('cmdb_ci');
            ci.addQuery('sys_id', 'IN', ciIds.join(','));
            ci.query();
            while (ci.next()) {
                found[ci.getUniqueValue()] = ci.model_id.manufacturer.getDisplayValue();
            }
        }

        ids.forEach(function(id) {
            if (found[id]) missing[id].manufacturer = found[id];
        });
        return rows;
    }

    function canCurrentUserActOnAsset(item) {
        var currentUserId = gs.getUserID();

        return currentUserId == item.assigned_to_sys_id ||
            currentUserId == item.reserved_for_sys_id;
    }
})();
