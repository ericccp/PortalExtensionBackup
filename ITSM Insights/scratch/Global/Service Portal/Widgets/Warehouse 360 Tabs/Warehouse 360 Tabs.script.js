(function () {
    // Display text lives here so labels and messages can be updated in one place
    data.text = {
        tabListLabel: options.tab_list_label
            ? gs.getMessage(options.tab_list_label)
            : gs.getMessage('Site views'),
        loading: gs.getMessage('Loading'),
        emptyTab: gs.getMessage('Nothing to show yet'),
        emptyTabHelp: gs.getMessage('Content for this tab has not been added yet.'),
        loadError: gs.getMessage('This tab could not be loaded. Please try again later.'),
        retry: gs.getMessage('Try again'),
        configError: gs.getMessage('The tabs for this page are not configured correctly.')
    };

    // Embedded widgets by sp_widget sys_id (or widget id). Options left out use each widget's schema defaults.
    var WIDGETS = {
        notification: 'b8282ae193485358600674418bba10a1', // Site Status Notification
        cards: 'e2e425ec938c9718600674418bba10ee', // Site Status Cards
        offerings: '005421ec938c9718600674418bba10ff', // Service Offerings
        incidents: '076aca4d93041f18600674418bba105a', // Incidents and Outages
        problems: 'ef07a5e493cc9718600674418bba10b9', // Known Problems
        changes: '3f452d2093cc9718600674418bba10ed', // Upcoming Changes
        maintenance: 'dd14e5ac938c9718600674418bba108f', // Maintenance Windows
        assets: '2275a8a593041358600674418bba10fd', // Monitored Assets
        toolbar: 'da5ee5a893d81b10600674418bba10f4', // Asset Action Toolbar
        contracts: '28711d2093d41b10600674418bba10e5', // Service Contracts
        incidentTrend: '8079c7f2244f48509bcff8268e56c8ac', // Priority Incident Trend (ITSM Insights scope)
        warranty: 'db5cc5bfbb7f4a46b84fda14713a3e3d' // Warranty and End of Life (ITSM Insights scope)
    };

    // Where Maintenance Windows' Request variance button goes; swap in the real catalog item or page
    var VARIANCE_URL = '?id=sc_cat_item&sys_id=YOUR_VARIANCE_ITEM_SYS_ID';

    // Buttons on the Assets tab's Asset Action Toolbar. '#' marks actions still waiting on their real page or
    // catalog item; swap them in when those exist
    var TOOLBAR_ACTIONS = [
        { label: 'Order', url: '?id=sc_home', icon: 'fa-shopping-cart' },
        { label: 'Check-in / Check-out', url: '/esc?id=equipment_checkout', icon: 'fa-exchange' },
        { label: 'Return', url: '#', icon: 'fa-undo' },
        { label: 'Physical Audit', url: '#', icon: 'fa-clipboard' },
        { label: 'Asset Support', url: '#', icon: 'fa-life-ring' }
    ];

    // Overview mirrors the warehouse_360 layout. The Tabs (JSON) option replaces this whole list.
    var DEFAULT_TABS = [
        {
            id: 'overview',
            label: 'Overview',
            rows: [
                // The notification renders nothing unless a major incident is active at the site
                { columns: [{ size: 12, widgets: [{ id: WIDGETS.notification }, { id: WIDGETS.cards }] }] },
                { columns: [{ size: 12, widgets: [{ id: WIDGETS.offerings }] }] },
                {
                    columns: [
                        { size: 8, widgets: [{ id: WIDGETS.incidents }, { id: WIDGETS.problems }, { id: WIDGETS.changes }] },
                        { size: 4, widgets: [{ id: WIDGETS.maintenance, options: { variance_url: VARIANCE_URL } }] }
                    ]
                }
            ]
        },
        {
            id: 'assets',
            label: 'Assets',
            rows: [
                // The toolbar's Actions option is a JSON string, like every widget option
                { columns: [{ size: 12, widgets: [{ id: WIDGETS.toolbar, options: { actions: JSON.stringify(TOOLBAR_ACTIONS) } }] }] },
                {
                    columns: [
                        // Stretched so the card's bottom edge lines up with Warranty and End of Life
                        { size: 6, stretch: true, widgets: [{ id: WIDGETS.assets, options: { max_classes: '12' } }] },
                        { size: 6, widgets: [{ id: WIDGETS.warranty }] }
                    ]
                },
                { columns: [{ size: 12, widgets: [{ id: WIDGETS.contracts }] }] }
            ]
        },
        {
            id: 'performance',
            label: 'Performance',
            rows: [
                { columns: [{ size: 12, widgets: [{ id: WIDGETS.incidentTrend }] }] }
            ]
        },
        {
            id: 'knowledge',
            label: 'Knowledge',
            rows: [
                { columns: [{ size: 12, widgets: [] }] }
            ]
        },
        {
            id: 'risk',
            label: 'Risk',
            rows: [
                { columns: [{ size: 12, widgets: [] }] }
            ]
        }
    ];

    var tabConfig = getTabConfig();
    if (!tabConfig.length) {
        data.configError = true;
        data.tabs = [];
        return;
    }

    // Labels and ids only; layouts stay on the server until a tab is opened
    data.tabs = tabConfig.map(function (tab) {
        return { id: tab.id, label: gs.getMessage(tab.label) };
    });

    if (input && input.action === 'loadTab') {
        var requested = findTab(String(input.tabId || ''));
        data.loadedTabId = requested ? requested.id : '';
        data.layout = requested ? buildLayout(requested) : null;
        data.loadFailed = !requested || data.layout === null;
        return;
    }

    if (!input) {
        var defaultTab = findTab(String(options.default_tab || '')) || tabConfig[0];
        var activeTab = findTab(String($sp.getParameter('tab_id') || '')) || defaultTab;
        data.defaultTabId = defaultTab.id;
        data.activeTabId = activeTab.id;
        data.layout = buildLayout(activeTab);
        data.loadFailed = data.layout === null;
    }

    function getTabConfig() {
        if (!options.tabs_json) return DEFAULT_TABS;
        try {
            var parsed = JSON.parse(String(options.tabs_json));
            return Array.isArray(parsed) ? parsed.filter(isValidTab) : [];
        } catch (e) {
            gs.error('Warehouse 360 Tabs: invalid Tabs (JSON) option. ' + e);
            return [];
        }
    }

    // tab_id comes from the URL and client input, so only ids from the config are accepted
    function isValidTab(tab) {
        return tab && /^[a-z0-9_-]+$/.test(tab.id) && typeof tab.label === 'string' && tab.label &&
            (tab.rows === undefined || Array.isArray(tab.rows));
    }

    function findTab(tabId) {
        for (var i = 0; i < tabConfig.length; i++) {
            if (tabConfig[i].id === tabId) return tabConfig[i];
        }
        return null;
    }

    // Returns [{ stretch, columns: [{ size, stretch, widgets: [spWidget] }] }], or null when building fails
    function buildLayout(tab) {
        try {
            return (tab.rows || []).map(function (row) {
                var columns = (row.columns || []).map(function (column) {
                    var size = parseInt(column.size, 10);
                    return {
                        size: size >= 1 && size <= 12 ? size : 12,
                        stretch: column.stretch === true,
                        widgets: (column.widgets || []).map(buildWidget).filter(Boolean)
                    };
                });
                return {
                    stretch: columns.some(function (column) { return column.stretch; }),
                    columns: columns
                };
            }).filter(function (row) {
                return row.columns.some(function (column) { return column.widgets.length; });
            });
        } catch (e) {
            gs.error('Warehouse 360 Tabs: could not build tab "' + tab.id + '". ' + e);
            return null;
        }
    }

    function buildWidget(entry) {
        if (!entry || typeof entry.id !== 'string') return null;
        var widget = $sp.getWidget(entry.id, entry.options || {});
        if (!widget) gs.warn('Warehouse 360 Tabs: widget "' + entry.id + '" was not found.');
        return widget || null;
    }
})();
