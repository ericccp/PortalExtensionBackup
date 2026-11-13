(function() {

    // Display text lives here so copy can be updated in one place
    data.text = {
        everyoneLabel: gs.getMessage("Everyone in my organization"),
        expandLabel: gs.getMessage("Expand"),
        collapseLabel: gs.getMessage("Collapse"),
        youSuffix: gs.getMessage("(You)")
    };
    data.currentUserId = gs.getUserID();

    // The people category renders as an org tree for managers
    var ORG_CATEGORY_ID = "assigned_to";
    var MAX_ORG_DEPTH = 15;
    var MAX_ORG_USERS = 1000;

    if (input && input.action === "getOrgNodes") {
        data.orgNodes = isOrgManager() ? getOrgNodes(input.userIds) : [];
        return;
    }

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
        var filterCategories = (Array.isArray(options.filterData) ? options.filterData : []).filter(function(category) {
            return category && Array.isArray(category.filters);
        });
        // AssetWidgetUtilsExtension skips empty values but not empty labels, so a reference to a
        // record with no name (or one the user can't read) shows as a blank option. It can't be
        // identified, so drop it. A dropped selection also leaves the applied filters, because
        // the client re-emits only the remaining selections on load.
        filterCategories.forEach(function(category) {
            category.filters = category.filters.filter(function(filter) {
                return filter && String(filter.label == null ? "" : filter.label).trim() !== "";
            });
        });
        // Keep active filters visible even when only one option is available.
        data.filterData = filterCategories.filter(function(category) {
            return (category.filters.length > 1 || category.filters.some(function(filter) {
                    return filter.selected;
                }));
        });
        populateSortWidget(data.tabId);
        populateSkipLevelToggleWidget(data.tabId, options.includeSkipLevels);

        if (data.filterData && data.filterData.length > 0) {
            data.showFilterContainer = true;
        }

        data.orgNodes = [];
        var orgCategory = data.filterData.filter(function(category) {
            return category.categoryId === ORG_CATEGORY_ID;
        })[0];
        if (orgCategory && isOrgManager()) {
            data.orgNodes = getOrgNodes(orgCategory.filters.map(function(filter) {
                return filter.value;
            }));
        }
    }

    function isOrgManager() {
        return new global.AssetWidgetUtilsExtension().isManager();
    }

    function readableField(record, name, raw) {
        if (!record.isValidField(name)) return "";
        var element = record.getElement(name);
        if (!element || !element.canRead()) return "";
        return String((raw ? record.getValue(name) : record.getDisplayValue(name)) || "");
    }

    // Returns [{ value, label, parent }] for the given users plus the managers
    // between them and the current user. People whose chain never reaches the current
    // user (themselves, or someone outside the org) come back as roots with no parent.
    function getOrgNodes(userIds) {
        var me = gs.getUserID();
        var users = {};
        // The current user is always listed so they can opt back in to their own devices
        var pending = [me].concat(Array.isArray(userIds) ? userIds : []).filter(function(id, index, list) {
            return /^[0-9a-f]{32}$/.test(String(id)) && list.indexOf(id) === index;
        }).slice(0, MAX_ORG_USERS);
        var requested = pending.slice();

        // One query per org level instead of one per person
        for (var depth = 0; pending.length && depth <= MAX_ORG_DEPTH; depth++) {
            var next = [];
            var user = new GlideRecordSecure("sys_user");
            user.addQuery("sys_id", "IN", pending.join(","));
            user.query();
            while (user.next()) {
                var id = user.getUniqueValue();
                var managerId = readableField(user, "manager", true);
                users[id] = {
                    value: id,
                    label: readableField(user, "name"),
                    manager: managerId
                };
                if (id !== me && managerId && managerId !== me && !users[managerId] && next.indexOf(managerId) === -1) {
                    next.push(managerId);
                }
            }
            pending = next;
        }

        var reaches = {};
        function reachesMe(id, seen) {
            if (reaches.hasOwnProperty(id)) return reaches[id];
            var entry = users[id];
            var result = false;
            if (entry && id !== me && !seen[id]) {
                seen[id] = true;
                result = entry.manager === me || (!!users[entry.manager] && reachesMe(entry.manager, seen));
            }
            reaches[id] = result;
            return result;
        }

        var nodes = [];
        var added = {};
        function addNode(entry, parent) {
            if (added[entry.value]) return;
            added[entry.value] = true;
            nodes.push({ value: entry.value, label: entry.label, parent: parent });
        }

        requested.forEach(function(id) {
            var entry = users[id];
            if (!entry) return;
            if (!reachesMe(id, {})) {
                addNode(entry, "");
                return;
            }
            while (entry && entry.value !== me) {
                addNode(entry, entry.manager === me ? "" : entry.manager);
                entry = users[entry.manager];
            }
        });
        return nodes;
    }

    function populateSkipLevelToggleWidget(tab, includeSkipLevels) {
        // Manager-hierarchy audience only applies to the Devices tab today.
        if (tab == "software") {
            return;
        }

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
                    label: gs.getMessage("Product name")
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
                label: gs.getMessage("Serial number")
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