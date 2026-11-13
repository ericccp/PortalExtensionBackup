api.controller = function ($scope, $element, $location, $timeout) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   None.
     *
     * Events being spied $on:
     *   $locationChangeSuccess - switches tabs when tab_id changes through back/forward. Source: AngularJS $location.
     *
     * Embedded widgets get their location from Site Status Header on their own: each one sends
     * siteStatusHeader.requestLocation when it loads, so tabs opened later still receive it.
     */
    var c = this;

    // Keeps tab and panel ids unique if the widget is on a page twice
    c.uid = $scope.$id;
    c.tabs = c.data.tabs;
    c.activeTabId = c.data.activeTabId;
    // Loaded tabs stay rendered (hidden) so switching back keeps their state and skips a reload
    c.layouts = {};
    c.tabState = {};
    c.tabs.forEach(function (tab) {
        c.tabState[tab.id] = { loading: false, failed: false };
    });
    if (c.activeTabId) {
        c.layouts[c.activeTabId] = c.data.layout;
        c.tabState[c.activeTabId].failed = c.data.loadFailed;
    }

    c.isActive = function (tab) {
        return tab.id === c.activeTabId;
    };

    c.selectTab = function (tab) {
        if (c.isActive(tab)) return;
        activate(tab.id);
        $location.search('tab_id', tab.id);
    };

    c.retry = function (tab) {
        loadTab(tab.id);
    };

    // Arrow keys move between tabs and activate them, per the WAI-ARIA tabs pattern
    c.onTabKeydown = function (event, index) {
        var keys = { 37: index - 1, 39: index + 1, 36: 0, 35: c.tabs.length - 1 };
        if (!keys.hasOwnProperty(event.keyCode)) return;
        event.preventDefault();
        var next = (keys[event.keyCode] + c.tabs.length) % c.tabs.length;
        c.selectTab(c.tabs[next]);
        $timeout(function () {
            var buttons = $element[0].querySelectorAll('.w360-tabs__tab');
            if (buttons[next]) buttons[next].focus();
        });
    };

    function activate(tabId) {
        c.activeTabId = tabId;
        if (!c.layouts[tabId] && !c.tabState[tabId].loading) loadTab(tabId);
    }

    function loadTab(tabId) {
        var state = c.tabState[tabId];
        state.loading = true;
        state.failed = false;
        c.server
            .get({ action: 'loadTab', tabId: tabId })
            .then(function (response) {
                if (response.data.loadFailed || response.data.loadedTabId !== tabId) {
                    state.failed = true;
                    return;
                }
                c.layouts[tabId] = response.data.layout;
            }, function () {
                state.failed = true;
            })
            .finally(function () {
                state.loading = false;
            });
    }

    // Back/forward changes tab_id without a click; ignore ids that aren't tabs on this page
    $scope.$on('$locationChangeSuccess', function () {
        var tabId = $location.search().tab_id || c.data.defaultTabId;
        if (tabId !== c.activeTabId && c.tabState.hasOwnProperty(tabId)) activate(tabId);
    });
};
