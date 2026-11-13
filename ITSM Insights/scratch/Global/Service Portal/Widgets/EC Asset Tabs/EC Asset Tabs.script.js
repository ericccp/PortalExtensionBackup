(function() {

    var util = new AssetWidgetUtilsExtension();

    // Content of the My team tab: My Team's IT Assets (Global sp_widget).
    var MY_TEAM_WIDGET = '9533b6319390d750600674418bba1070';

    data.limit = options.limit;
    data.isManager = util.isManager();
    data.isCostCenterManager = util.isCostCenterManager();
    data.teamTab = { label: gs.getMessage("My team"), selected: false, sys_id: "team" };

    data.hardwareTab = {
        label: gs.getMessage("Devices"),
        selected: false,
        sys_id: "devices"
    };
    data.softwareTab = {
        label: gs.getMessage("Software licenses"),
        selected: false,
        sys_id: "software"
    };

    data.activeTabId = String($sp.getParameter("tab_id") || "");
    data.selectedTab = {};

    if (!input) {
        data.tabs = [];
        data.tabs.push(data.hardwareTab);
        data.tabs.push(data.softwareTab);
        // URL navigation (e.g. syncEmployeeUrl's $location.search) can recreate
        // this widget after the toggle is flipped, and c.data.includeSkipLevels
        // is otherwise only an in-memory Angular value - echo it in the URL too,
        // same as tab_id/assigned_to below, so it survives that recreation.
        // $sp.getParameter returns a Java string, which never === a JS string literal.
        // Skip levels start on for managers who have them; the URL records only a change from that.
        data.defaultIncludeSkipLevels = !!(data.isManager && util.hasSkipLevels());
        var includeSkipLevelsParam = String($sp.getParameter("include_skip_levels") || "");
        data.includeSkipLevels = includeSkipLevelsParam ? includeSkipLevelsParam === "true" : data.defaultIncludeSkipLevels;
        if (data.isManager) data.tabs.push(data.teamTab);

        // Ensure we have data on initial load by setting the selected tab
        var allowedTab = data.tabs.some(function(tab) { return tab.sys_id === data.activeTabId; });
        data.activeTabId = allowedTab ? data.activeTabId : data.hardwareTab.sys_id;
        if (data.activeTabId) {
            // URL navigation can recreate this widget after the immediate tab request.
            var assignedTo = String($sp.getParameter("assigned_to") || "");
            var employeeIds = assignedTo.split(',').filter(function(id) { return /^[0-9a-f]{32}$/.test(id); });
            data.uiFilters = employeeIds.length ? {
                assigned_to: { filterType: 'choice', selectedOptions: employeeIds }
            } : null;
            setSelectedTab(data.activeTabId, data.uiFilters, "", options.limit, null, null, data.includeSkipLevels);
        }

        data.currentView = getCurrentView();

    }

    if (input && input.action === 'fetchTabData') {
        setSelectedTab(input.tabId, input.uiFilters, input.searchParam, input.limit, input.statusFilter, input.sortOption, input.includeSkipLevels);
    }

    if (input && input.action === 'fetchSwitchedTabData') {
        setSelectedTab(input.tabId, input.uiFilters, input.searchParam, input.limit, input.statusFilter, input.sortOption, input.includeSkipLevels);
    }

    // Direct reports only unless skip levels are on, then the configured hierarchy depth.
    function getReportIds(includeSkipLevels) {
        var depth = includeSkipLevels ? util._getManagerHierarchyDepth() : 1;
        return util._getAllReportSysIds(gs.getUserID(), depth);
    }

    function readableField(record, name, raw) {
        if (!record.isValidField(name)) return '';
        var element = record.getElement(name);
        if (!element || !element.canRead()) return '';
        return String((raw ? record.getValue(name) : record.getDisplayValue(name)) || '');
    }

    function getCurrentView() {
        // Retrieve saved view preference from session
        var currentView = "card"; // Default
        var savedPreferences = gs.getSession().getClientData("assetsViewPreference");
        if (savedPreferences) {
            try {
                var prefObj = JSON.parse(savedPreferences);
                if (prefObj.userId == gs.getUserID()) {
                    currentView = prefObj.view;
                }
            } catch (e) {
                // Invalid JSON, use default
            }
        }
        return currentView;
    }

    function setSelectedTab(tabId, uiFilters, searchParam, limit, statusFilter, sortOption, includeSkipLevels) {
        tabId = String(tabId || "");
        data.isTeamTab = tabId === data.teamTab.sys_id && data.isManager;
        if (tabId === data.teamTab.sys_id) {
            data.assetFilters = null;
            data.assetContent = null;
            data.teamWidget = null;
            data.teamError = '';
            // Check manager access on every request, including direct URL/server calls.
            if (data.isTeamTab) {
                // My Team's IT Assets loads the roster, its own skip-level toggle and errors.
                data.teamWidget = $sp.getWidget(MY_TEAM_WIDGET, {
                    embedded: 'true',
                    include_skip_levels: String(!!includeSkipLevels)
                });
            } else {
                data.teamError = gs.getMessage('My team is available to managers only.');
            }
            return;
        }
        var isHardwareTab = (tabId === data.hardwareTab.sys_id);
        var isSoftwareTab = (tabId === data.softwareTab.sys_id);
        // Managers start on their own devices and opt in to others from the Assigned to filter.
        // null means no choice yet (fresh page or tab switch); {} is an explicit Clear all and is kept.
        if (isHardwareTab && data.isManager && !uiFilters) {
            uiFilters = { assigned_to: { filterType: 'choice', selectedOptions: [gs.getUserID()] } };
            data.uiFilters = uiFilters;
        }
        var currentView = getCurrentView();
        data.selectedTab = {
            tabId: tabId,
            hardwareTabId: data.hardwareTab.sys_id,
            softwareTabId: data.softwareTab.sys_id,
            uiFilters: uiFilters,
            searchParam: searchParam,
            limit: limit,
            view: currentView,
            statusFilter: statusFilter,
            sortOption: sortOption,
            includeSkipLevels: includeSkipLevels
        };

        options.filterData = util.getAssetFiltersForTab(tabId, searchParam, statusFilter, includeSkipLevels);
        // Restore active selections when the filter widget is created for a tab.
        options.filterData.forEach(function(category) {
            var active = uiFilters && uiFilters[category.categoryId];
            if (!active || !Array.isArray(active.selectedOptions)) return;
            category.filters.forEach(function(filter) {
                filter.selected = active.selectedOptions.indexOf(filter.value) !== -1;
            });
            if (category.categoryId !== 'assigned_to' || !data.isManager) return;
            var reportIds = getReportIds(includeSkipLevels);
            active.selectedOptions.forEach(function(employeeId) {
                if (category.filters.some(function(filter) { return filter.value === employeeId; })) return;
                // Employees with no matching assets still need a removable filter pill.
                var employee = new GlideRecordSecure('sys_user');
                // The manager's own default selection, even when they have no devices yet
                if (employeeId === gs.getUserID()) {
                    if (employee.get(employeeId)) {
                        category.filters.push({ value: employeeId, label: readableField(employee, 'name'), selected: true });
                    }
                    return;
                }
                // Same roster as My team at the current skip-level depth.
                if (reportIds.indexOf(employeeId) !== -1 && employee.get(employeeId)) {
                    category.filters.push({ value: employeeId, label: readableField(employee, 'name'), selected: true });
                }
            });
        });
        options.searchText = encodeURIComponent(data.selectedTab.searchParam) || "";
        options.hasFilters = options.filterData.length > 0;
        options.view = currentView;
        options.tabId = tabId;
        options.includeSkipLevels = includeSkipLevels;
        data.assetFilters = $sp.getWidget('ec-asset-filters-v2', options);
        data.assetContent = $sp.getWidget('ec-asset-content', data.selectedTab);

    }

})();
