api.controller = function ($rootScope, $scope) {
    /* widget controller */
    var c = this;

    var LOCATION_EVENT = 'siteStatusHeader.location';
    var LOCATION_REQUEST_EVENT = 'siteStatusHeader.requestLocation';

    c.loading = true;
    c.locationId = null;
    c.noLocation = false;
    c.page = 0;

    c.pageCount = function () {
        return Math.ceil((c.data.windows || []).length / c.data.pageSize);
    };

    c.goToPage = function (page) {
        c.page = Math.max(0, Math.min(page, c.pageCount() - 1));
    };

    c.pageLabel = function () {
        return c.data.messages.page.replace('{0}', c.page + 1).replace('{1}', c.pageCount());
    };

    function loadWindows(event, location) {
        var locationId = (location && location.sys_id) || '';
        if (!location || locationId === c.locationId) return;
        c.locationId = locationId;
        // The Site Status Header sends an empty location when none is selected and the page has no default
        c.noLocation = !locationId;
        if (c.noLocation) {
            c.data.windows = [];
            c.data.locationFound = true;
            c.data.loadFailed = false;
            c.loading = false;
            return;
        }
        c.loading = true;
        c.server
            .get({ action: 'getWindows', locationId: locationId })
            .then(function (response) {
                // A newer selection was made while this request was running
                if (locationId !== c.locationId) return;
                c.data.windows = response.data.windows;
                c.data.locationFound = response.data.locationFound;
                c.page = 0;
            })
            .finally(function () {
                if (locationId === c.locationId) c.loading = false;
            });
    }

    // Downloads every listed window as one .ics file, which calendar apps import as separate events
    c.addToCalendar = function () {
        var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ServiceNow//Site Status//EN', 'METHOD:PUBLISH'];
        var stamp = toIcsDate(new Date().toISOString());
        c.data.windows.forEach(function (item) {
            lines.push(
                'BEGIN:VEVENT',
                'UID:' + item.id + '@maintenance-windows',
                'DTSTAMP:' + stamp,
                'DTSTART:' + toIcsDate(item.start),
                'DTEND:' + toIcsDate(item.end),
                'SUMMARY:' + escapeIcs(item.title),
                'DESCRIPTION:' + escapeIcs(item.impact ? item.number + ' · ' + item.impact : item.number),
                'END:VEVENT'
            );
        });
        lines.push('END:VCALENDAR');

        var blob = new Blob([lines.map(foldIcsLine).join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'maintenance-windows.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    // "2026-10-18 02:00:00" (GlideDateTime UTC) or an ISO string -> "20261018T020000Z"
    function toIcsDate(value) {
        return value.replace(/\.\d+Z?$|Z$/, '').replace(/[-:]/g, '').replace(/[ T]/, 'T') + 'Z';
    }

    function escapeIcs(text) {
        return String(text || '')
            .replace(/\\/g, '\\\\')
            .replace(/\r?\n/g, '\\n')
            .replace(/([,;])/g, '\\$1');
    }

    // Content lines longer than 75 characters continue on lines that start with a space
    function foldIcsLine(line) {
        var parts = [line.slice(0, 75)];
        for (var i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
        return parts.join('\r\n');
    }

    var unbindLocation = $rootScope.$on(LOCATION_EVENT, loadWindows);
    $scope.$on('$destroy', unbindLocation);

    // Covers the case where the header broadcast before this widget was listening
    $rootScope.$broadcast(LOCATION_REQUEST_EVENT);
};
