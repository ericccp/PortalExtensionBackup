api.controller = function($scope, $element, $timeout, $location, $rootScope) {
    /*
     * Events being $broadcast:
     *   sn_ex_sp.exportAssets - forwards an export request to child content when loading and tab switching are finished. Receiving Widget: EC Asset Content.
     *   sn_ex_sp.assetDisplayViewUpdated - forwards the selected card/list view to child content. Receiving Widget: EC Asset Content.
     *   sn_ex_sp.assetFiltersRefreshed - sends the tabId and freshly recomputed filterData after a skip-level toggle, so the live EC Asset Filters instance can update its categories without being recreated. Receiving Widget: EC Asset Filters.
     *
     * Events being $emit:
     *   ec_asset_tabs.loading_complete - emitted on $rootScope after tab visibility is updated. Receiving Widget: EC Assets.
     *
     * Events being spied $on:
     *   sn_ex_sp.exportAssetsRequested - stops propagation and forwards export requests when ready. Emitting Widget: EC Asset Filters.
     *   my_assets.filter.changed - listens on $rootScope and applies panel choices to UI filters and reloads the active tab.
     *   sn_ex_sp.sortOptSelected - listens on $rootScope and reloads the matching active tab with the selected sort. Configured Source: ah-sort-by embedded by EC Asset Filters.
     *   sn_ex_sp.toggleSkipLevels - listens on $rootScope and reloads the matching active tab with the manager-hierarchy audience expanded or collapsed. Emitting Widget: asset-hub-toggle-skip-levels, embedded by EC Asset Filters. (My Team's IT Assets handles its own toggle.)
     *   myTeamItAssets.viewEmployeeAssets - prevents the default navigation and opens the Devices or Software licenses tab filtered to the employee. Emitting Widget: My Team's IT Assets, embedded in the My team tab.
     *   $destroy - unregisters the root-scope filter/sort/skip-level listeners and removes the window resize handler. Source: AngularJS scope lifecycle.
     *   sn_ex_sp.applyAssetSearch - reloads the active tab with the supplied search text. Emitting Widget: EC Asset Filters.
     *   sn_ex_sp.applyAssetFilters - converts filter selections and reloads the active tab. Emitting Widget: EC Asset Filters.
     *   sn_ex_sp.AssetFiltersCleared - clears the stored UI filters. Emitting Widget: EC Asset Filters.
     *   sn_ex_sp.viewChanged - stores the selected view and broadcasts it to child content. Emitting Widget: EC Asset Filters.
     *
     * DOM events handled:
     *   resize (window) - recalculates visible and overflow tabs through a debounced handler; removed on $destroy.
     */
    var c = this;

    $scope.$on('sn_ex_sp.exportAssetsRequested', function(event, request) {
        event.stopPropagation();
        if (!$scope.isLoading && !$scope.isTabSwitching) {
            $scope.$broadcast('sn_ex_sp.exportAssets', request);
        }
    });

    c.tabs = c.data.tabs;
    c.data.visibleTabs = [];
    c.data.overflowTabs = [];
    c.activeTab = null;
    c.isDropdownOpen = false;
    $scope.isLoading = true;
    $scope.isTabSwitching = true;
    var urlTabId = $location.search().tab_id || c.data.activeTabId;
    var urlAssignedTo = $location.search().assigned_to || '';

    function employeeFilters(value) {
        return value ? { assigned_to: { filterType: 'choice', selectedOptions: String(value).split(',') } } : null;
    }

    function syncEmployeeUrl() {
        var assignedTo = c.data.uiFilters && c.data.uiFilters.assigned_to;
        urlAssignedTo = assignedTo ? assignedTo.selectedOptions.join(',') : '';
        $location.search('assigned_to', urlAssignedTo || null);
    }

    // c.data.includeSkipLevels only lives in this widget's Angular scope, but
    // $location.search changes elsewhere (syncEmployeeUrl, sort, tab switch)
    // recreate this widget from the server - echo it in the URL like
    // assigned_to/tab_id so it survives that recreation instead of silently
    // reverting to depth-1 audience with the toggle showing unchecked.
    function syncIncludeSkipLevelsUrl() {
        var includeSkipLevels = !!c.data.includeSkipLevels;
        // On is the default for managers with skip levels, so only a change from it goes in the URL
        $location.search('include_skip_levels', includeSkipLevels === !!c.data.defaultIncludeSkipLevels ? null : String(includeSkipLevels));
    }

    c.data.currentView = c.data.currentView || 'card';
    c.init = function() {
        // Check for tab ID in URL or use data.activeTabId
        var tabId = urlTabId || c.data.activeTabId;

        if (c.tabs.length) {
            // Find tab by ID
            for (var j = 0; j < c.tabs.length; j++) {
                if (c.tabs[j].sys_id == tabId) {
                    c.activeTab = c.tabs[j];
                    break;
                }
            }
        }

        // show hardware tab if user is on devices tab or has searched for devices
        if ((c.data.activeTabId == "devices") && c.data.showHardwareTab) {
            $scope.searchText = c.data.draftSearchText;
            for (var i = 0; i < c.tabs.length; i++) {
                if (c.tabs[i].sys_id == c.data.hardwareTab.sys_id) {
                    c.activeTab = c.tabs[i];
                    break;
                }
            }
            // set tab_id in URL to devices
            $location.search('tab_id', 'devices');
        }

        if (!c.activeTab) {
            c.activeTab = c.tabs[0];
            c.data.activeTabId = c.tabs[0].sys_id;
        }

        $timeout(function() {
            c.recalculateTabs();
        }, 100);

        var recalcTabsDebounced = _.debounce(function() {
            c.recalculateTabs();
        }, 200);

        angular.element(window).bind('resize', recalcTabsDebounced);

        // Store for cleanup
        c._recalcTabsDebounced = recalcTabsDebounced;
        $scope.isLoading = false;
        $scope.isTabSwitching = false;
    };

    var tabLoadSequence = 0;
    var contentLoadSequence = 0;
    c.tabLoadError = '';
    c.loadTab = function(tab, retry, initialFilters) {
        if (!tab || (!retry && urlTabId === tab.sys_id && c.activeTab === tab)) return;
        // $locationChangeSuccess below calls loadTab(tab, true, ...) for the
        // CURRENT tab whenever assigned_to changes in the URL - including from
        // this widget's own syncEmployeeUrl() after an in-tab filter apply, not
        // just real navigation. Only treat it as a tab switch (and reset
        // skip levels) when the tab is actually changing.
        var isTabSwitch = tab.sys_id !== urlTabId;
        var sequence = ++tabLoadSequence;
        ++contentLoadSequence;
        c.activeTab = tab;
        urlTabId = tab.sys_id;
        c.data.activeTabId = tab.sys_id;
        c.data.isTeamTab = tab.sys_id === 'team';
        c.data.teamWidget = null;
        c.data.teamError = '';
        c.data.assetFilters = null;
        c.data.assetContent = null;
        c.data.uiFilters = initialFilters || (retry ? c.data.uiFilters : null);
        c.data.searchParam = '';
        c.data.sortOption = null;
        if (isTabSwitch) {
            c.data.includeSkipLevels = !!c.data.defaultIncludeSkipLevels;
            syncIncludeSkipLevelsUrl();
        }
        c.tabLoadError = '';
        $scope.isLoading = true;
        $scope.isTabSwitching = true;
        c.server.get({
            action: 'fetchSwitchedTabData',
            tabId: tab.sys_id,
            uiFilters: c.data.uiFilters,
            searchParam: '',
            limit: c.data.limit,
            statusFilter: c.data.statusFilter,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(response) {
            if (sequence !== tabLoadSequence) return;
            var result = response.data;
            c.data.isManager = result.isManager;
            c.data.isTeamTab = result.isTeamTab;
            c.data.teamWidget = result.teamWidget;
            c.data.teamError = result.teamError || '';
            c.data.assetFilters = result.assetFilters;
            c.data.assetContent = result.assetContent;
            if (tab.sys_id === 'team' && !result.teamWidget) {
                c.tabLoadError = result.teamError || '${Unable to load your team. Please try again.}';
            }
            $scope.isLoading = false;
            $scope.isTabSwitching = false;
            c.recalculateTabs();
        }, function() {
            if (sequence !== tabLoadSequence) return;
            c.tabLoadError = '${Unable to load this tab. Please try again.}';
            $scope.isLoading = false;
            $scope.isTabSwitching = false;
        });
    };

    c.viewEmployeeAssets = function(employee, tabId) {
        var tab = c.tabs.find(function(item) { return item.sys_id === tabId; });
        if (!tab || !employee || !employee.sysId) return;
        $scope.searchText = '';
        c.data.draftSearchText = '';
        c.data.statusFilter = null;
        $location.search('draftSearchText', null);
        urlAssignedTo = employee.sysId;
        $location.search('assigned_to', urlAssignedTo);
        c.loadTab(tab, false, employeeFilters(urlAssignedTo));
        $location.search('tab_id', tab.sys_id);
    };

    $scope.$on('myTeamItAssets.viewEmployeeAssets', function(event, request) {
        event.preventDefault();
        if (request) c.viewEmployeeAssets({ sysId: request.employeeId }, request.tabId);
    });

    c.selectTab = function(tab) {
        if (!tab) return;
        $scope.searchText = '';
        c.data.draftSearchText = '';
        $location.search('draftSearchText', null);
        urlAssignedTo = '';
        $location.search('assigned_to', null);
        c.loadTab(tab);
        $location.search('tab_id', tab.sys_id);
    };

    // Handle URL navigation even when the portal keeps this widget mounted.
    $scope.$on('$locationChangeSuccess', function() {
        var tabId = $location.search().tab_id || c.data.hardwareTab.sys_id;
        var tab = c.tabs.find(function(item) { return item.sys_id === tabId; });
        var assignedTo = $location.search().assigned_to || '';
        if (tab && (tab.sys_id !== urlTabId || assignedTo !== urlAssignedTo)) {
            urlAssignedTo = assignedTo;
            c.loadTab(tab, true, employeeFilters(assignedTo) || {});
        }
    });
    $scope.$on('$destroy', function() { tabLoadSequence++; });

    c.selectFromDropdown = function(tab) {
        c.isDropdownOpen = false;

        if (c.data.visibleTabIds.indexOf(tab.sys_id) !== -1) {
            c.activeTab = tab;
            c.updateTabVisibility();
            c.selectTab(tab);
            return;
        }

        // Update visible tabs
        c.data.visibleTabIds.pop();
        c.data.visibleTabIds.push(tab.sys_id);
        c.data.overflowTabs = [];
        for (var i = 0; i < c.tabs.length; i++) {
            if (c.data.visibleTabIds.indexOf(c.tabs[i].sys_id) === -1) {
                c.data.overflowTabs.push(c.tabs[i]);
            }
        }

        c.activeTab = tab;
        c.updateTabVisibility();
        c.selectTab(tab);
    };
    c.updateTabVisibility = function() {
        var allTabs = $element[0].querySelectorAll('.nav-tab');
        for (var i = 0; i < allTabs.length; i++) {
            var tabEl = allTabs[i];
            var tabId = tabEl.getAttribute('data-tab');
            if (c.data.visibleTabIds.indexOf(tabId) !== -1) {
                tabEl.classList.remove('hidden');
            } else {
                tabEl.classList.add('hidden');
            }
        }
        $rootScope.$emit('ec_asset_tabs.loading_complete');
    };
    c.recalculateTabs = function() {
        $timeout(function() {
            var fitCount = c.calculateFittingTabs();
            c.data.fitCount = fitCount;
            var activeTabId = c.activeTab ? c.activeTab.sys_id : "";
            c.data.visibleTabIds = [];
            for (var i = 0; i < fitCount; i++) {
                c.data.visibleTabIds.push(c.tabs[i].sys_id);
            }
            if (activeTabId && c.data.visibleTabIds.indexOf(activeTabId) === -1) {
                c.data.visibleTabIds.pop();
                c.data.visibleTabIds.push(activeTabId);
            }
            c.data.overflowTabs = [];
            for (var j = 0; j < c.tabs.length; j++) {
                if (c.data.visibleTabIds.indexOf(c.tabs[j].sys_id) === -1) {
                    c.data.overflowTabs.push(c.tabs[j]);
                }
            }
            c.updateTabVisibility();
        });
    };

    c.calculateFittingTabs = function() {
        var container = $element[0].querySelector('[ng-ref="tabWrapper"]');
        if (!container) return 0;
        var availableWidth = container.offsetWidth - 8;
        var moreWidth = 80;
        var usedWidth = 0;
        var fitCount = 0;
        var tabsEle = $element[0].querySelectorAll('.nav-tab');
        for (var i = 0; i < tabsEle.length; i++) {
            var tab = tabsEle[i];
            tab.classList.remove('hidden');
            tab.classList.add('visible');
            var tabWidth = tab.getBoundingClientRect().width;
            if (usedWidth + tabWidth + moreWidth <= availableWidth) {
                usedWidth += tabWidth;
                fitCount++;
                tab.classList.add('hidden');
                tab.classList.remove('visible');
            } else {
                tab.classList.add('hidden');
                tab.classList.remove('visible');
                break;
            }
        }
        return fitCount;
    };

    var TAB_BY_APPLIES_TO = {
        hardware: c.data.hardwareTab,
        software: c.data.softwareTab
    };

    var unregisterFilterChanged = $rootScope.$on('my_assets.filter.changed', function(event, filterData) {
        if (c.data.isTeamTab) return;

        // A clear should never switch tabs on its own.
        var targetTab = !filterData.clearFilter ?
            (TAB_BY_APPLIES_TO[filterData.appliesTo] || c.data.hardwareTab) : null;

        if (targetTab && c.activeTab.sys_id !== targetTab.sys_id) {
            c.data.statusFilter = filterData.statusFilter;
            c.selectTab(targetTab);
            return;
        }

        $scope.isLoading = true;

        // Keep panel choices in the same applied state as the Status dropdown.
        // Remove previous panel choices before applying or clearing a panel.
        c.data.statusFilter = null;
        c.data.uiFilters = c.data.uiFilters || {};
        var status = c.data.uiFilters.install_status || { filterType: 'choice', selectedOptions: [] };
        status.selectedOptions = status.selectedOptions.filter(function(value) { return !isNaN(value); });
        if (!filterData.clearFilter) status.selectedOptions.push(filterData.statusFilter);
        if (status.selectedOptions.length) c.data.uiFilters.install_status = status;
        else delete c.data.uiFilters.install_status;

        var contentSequence = ++contentLoadSequence;
        c.server.get({
            action: 'fetchTabData',
            tabId: c.activeTab.sys_id,
            definitionId: c.data.definitionId,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(resp) {
            $timeout(function() {
                if (contentSequence !== contentLoadSequence) return;
                c.data.assetContent = resp.data.assetContent;
                $scope.isLoading = false;
            }, 100);
        });
    });


    var unregisterSortSelected = $rootScope.$on('sn_ex_sp.sortOptSelected', function(event, sortData) {
        if (c.data.isTeamTab) return;
        if (!sortData || sortData.tabId != c.activeTab.sys_id)
            return;

        $scope.isLoading = true;
        c.data.sortOption = sortData.sort;

        var contentSequence = ++contentLoadSequence;
        c.server.get({
            action: 'fetchTabData',
            tabId: c.activeTab.sys_id,
            definitionId: c.data.definitionId,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(resp) {
            $timeout(function() {
                if (contentSequence !== contentLoadSequence) return;
                c.data.assetContent = resp.data.assetContent;
                $scope.isLoading = false;
            }, 100);
        });
    });

    var unregisterSkipLevelsToggled = $rootScope.$on('sn_ex_sp.toggleSkipLevels', function(event, toggleData) {
        if (!toggleData || toggleData.tabId != c.activeTab.sys_id)
            return;

        $scope.isLoading = true;
        c.data.includeSkipLevels = !!toggleData.includeSkipLevels;
        syncIncludeSkipLevelsUrl();

        var contentSequence = ++contentLoadSequence;
        c.server.get({
            action: 'fetchTabData',
            tabId: c.activeTab.sys_id,
            definitionId: c.data.definitionId,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(resp) {
            $timeout(function() {
                if (contentSequence !== contentLoadSequence) return;
                c.data.assetContent = resp.data.assetContent;
                $scope.isLoading = false;
            }, 100);
            // Recomputed with the expanded/collapsed audience server-side, but the
            // live EC Asset Filters instance isn't swapped (that would also
            // recreate the nested toggle widget and reset its own on/off state) -
            // hand it just the fresh filter categories instead.
            var refreshedFilterData = resp.data.assetFilters && resp.data.assetFilters.data && resp.data.assetFilters.data.filterData;
            if (Array.isArray(refreshedFilterData)) {
                $rootScope.$broadcast('sn_ex_sp.assetFiltersRefreshed', {
                    tabId: toggleData.tabId,
                    filterData: refreshedFilterData
                });
            }
        });
    });

    $scope.$on('$destroy', function() {
        unregisterFilterChanged();
        unregisterSortSelected();
        unregisterSkipLevelsToggled();
        angular.element(window).unbind('resize', c._recalcTabsDebounced);
    });

    $scope.$on("sn_ex_sp.applyAssetSearch", function(event, filterData, searchQuery) {
        if (c.data.isTeamTab) return;
        c.data.searchParam = searchQuery;
        $scope.isLoading = true;
        var contentSequence = ++contentLoadSequence;
        c.server.get({
            action: 'fetchTabData',
            tabId: c.activeTab.sys_id,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(resp) {
            $timeout(function() {
                if (contentSequence !== contentLoadSequence) return;
                c.data.assetContent = resp.data.assetContent;
                $scope.isLoading = false;
            }, 100);
        });
    });

    $scope.$on("sn_ex_sp.applyAssetFilters", function(event, filterData) {
        if (c.data.isTeamTab) return;
        
		$scope.isLoading = true;
        c.data.uiFilters = getUiFilters(filterData);
        c.data.statusFilter = null;
        syncEmployeeUrl();

        var contentSequence = ++contentLoadSequence;
        c.server.get({
            action: 'fetchTabData',
            tabId: c.activeTab.sys_id,
            definitionId: c.data.definitionId,
            uiFilters: c.data.uiFilters,
            limit: c.data.limit,
            searchParam: c.data.searchParam,
            statusFilter: c.data.statusFilter,
            sortOption: c.data.sortOption,
            includeSkipLevels: c.data.includeSkipLevels
        }).then(function(resp) {
            $timeout(function() {
                if (contentSequence !== contentLoadSequence) return;
                // changing this assetContent creates breaking change
                c.data.assetContent = resp.data.assetContent;
                $scope.isLoading = false;
            }, 100);
        });
    });

    $scope.$on("sn_ex_sp.AssetFiltersCleared", function(event, filterData) {
        c.data.uiFilters = {};
        syncEmployeeUrl();
    });

    $scope.$on('sn_ex_sp.viewChanged', function(event, data) {
        if (data && data.view) {
            // Store the view locally for immediate UI update
            c.data.currentView = data.view;
            $scope.$broadcast('sn_ex_sp.assetDisplayViewUpdated', {
                view: data.view
            });
        }
    });

    function getUiFilters(filterData) {
        var uiFilters = {};
        for (var i = 0; i < filterData.length; i++) {
            var item = filterData[i];
            var categoryId = item.categoryId;
            var filterType = item.filterType;
            var selectedFilters = item.selectedFilters;
            var tempFilters = [];
            for (var j = 0; j < selectedFilters.length; j++) {
                tempFilters.push(selectedFilters[j].value);
            }
            if (tempFilters.length > 0) {
                uiFilters[categoryId] = {};
                uiFilters[categoryId].filterType = filterType;
                uiFilters[categoryId].selectedOptions = tempFilters;
            }
        }
        return uiFilters;
    }

    c.toggleDropdown = function() {
        c.isDropdownOpen = !c.isDropdownOpen;
    };
};
