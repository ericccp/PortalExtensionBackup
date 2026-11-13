(function () {
    
    data.isMobile = gs.isMobile();
    data.assetExportEnabled = gs.getProperty('asset_export.enabled', 'false') === 'true';
    data.showFilterContainer = false;
    data.clearLabel = gs.getMessage("Clear Filter {0}");
    data.initialSearchText = decodeURIComponent(options.searchText) || "";
    data.hideFilters = options.hideFilters;
    data.tabId = options.tabId || $sp.getParameter("tab_id") || "devices";

    // Handle view storage action from client
    if (input && input.action === "storeView") {
        var preferences = JSON.stringify({
            view: input.view,
            userId: gs.getUserID()
        });
        gs.getSession().putClientData('assetsViewPreference', preferences);
        data.view = input.view;
        return;
    }

    if (options.view) {
        data.view = options.view;
    } else {
        data.view = "card"; // Default view 
        var savedPreferences = gs.getSession().getClientData("assetsViewPreference");
        if (savedPreferences) {
            try {
                var prefObj = JSON.parse(savedPreferences);
                if (prefObj.userId == gs.getUserID()) {
                    data.view = prefObj.view;
                }
            } catch (e) {
                // Invalid JSON, use default
            }
        }
    }

    if (!input) {
        // Keep active filters visible even when only one option is available.
        data.filterData = (Array.isArray(options.filterData) ? options.filterData : []).filter(function(category) {
            return category && Array.isArray(category.filters) &&
                (category.filters.length > 1 || category.filters.some(function(filter) { return filter.selected; }));
        });
        populateSortWidget(data.tabId);
        populateSkipLevelToggleWidget(data.tabId, options.includeSkipLevels);

        if (data.filterData && data.filterData.length > 0) {
            data.showFilterContainer = true;
        }
    }

    function populateSkipLevelToggleWidget(tab, includeSkipLevels) {
        var assetUtil = new global.AssetWidgetUtilsExtension();
        if (!assetUtil.isManager()) {
            return;
        }

        data.assetSkipLevelToggleWidget = $sp.getWidget("asset-hub-toggle-skip-levels", {
            hasSkipLevels: assetUtil.hasSkipLevels(),
            tabId: tab,
            includeSkipLevels: includeSkipLevels
        });
    }

    function populateSortWidget(tab) {
        var sortByWidgetOptions = {
            sort_options: getSortOptions(tab),
            onselect_event: "sn_ex_sp.sortOptSelected",
            selectedTab: tab
        };
        data.assetSortByWidget = $sp.getWidget("ah-sort-by", sortByWidgetOptions);
    }

    function getSortOptions(tab) {
        if (tab == "software") {
            return [{
                    value: "productName",
                    label: gs.getMessage("Product name"),
                    default: true
                },
                {
                    value: "assignedTo",
                    label: gs.getMessage("Assigned to")
                },
                {
                    value: "newest",
                    label: gs.getMessage("Date added (newest)")
                },
                {
                    value: "oldest",
                    label: gs.getMessage("Date added (oldest)")
                }
            ];
        }

        return [{
                value: "serialNumber",
                label: gs.getMessage("Serial number"),
                default: true
            },
            {
                value: "assignedTo",
                label: gs.getMessage("Assigned to")
            },
            {
                value: "newest",
                label: gs.getMessage("Date added (newest)")
            },
            {
                value: "oldest",
                label: gs.getMessage("Date added (oldest)")
            }
        ];
    }

})();
