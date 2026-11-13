(function () {
    // Cards load on demand once the Site Status Header broadcasts its location
    data.cards = [];
    data.locationFound = true;

    // Display text lives here so messages can be updated in one place
    data.messages = {
        chooseLocation: gs.getMessage('Choose a location to see its site status.'),
        locationNotFound: gs.getMessage('Location not found.')
    };

    if (input && input.action === 'getCards') {
        var cards = new SiteStatusUtility().getStatusCards(input.locationId, {
            includeChildLocations: String(options.include_child_locations) !== 'false',
            ciTable: options.ci_table,
            ciFilter: options.ci_filter
        });
        // null means the location was not found; an empty list can be falsy here, so compare explicitly
        data.locationFound = cards !== null;
        data.cards = cards === null ? [] : cards;

        // Each card's value links to the list of the records it counts
        var listPage = options.list_page || '';
        data.cards.forEach(function (card) {
            if (card.table && card.query)
                card.url = listPage
                    ? '?id=' + encodeURIComponent(listPage) + '&table=' + encodeURIComponent(card.table) +
                      '&filter=' + encodeURIComponent(card.query)
                    : '/' + card.table + '_list.do?sysparm_query=' + encodeURIComponent(card.query);
            card.linkLabel = gs.getMessage('{0}: {1}, view list', [card.label, String(card.value)]);
            delete card.query;
        });
    }
})();
