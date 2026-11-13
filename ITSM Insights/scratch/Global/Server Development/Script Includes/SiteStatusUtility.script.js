var SiteStatusUtility = Class.create();
SiteStatusUtility.prototype = {
    // How many levels of child cmn_location records roll up into a site
    MAX_LOCATION_DEPTH: 5,
    // User preference holding the comma-separated cmn_location sys_ids chosen in the Site Status Header
    LOCATION_PREF: 'site_status_header.locations',
    HIGH_PRIORITIES: '1,2',
    // Scheduled, Implement, Review, Closed - excludes drafts and cancelled changes
    MAINTENANCE_STATES: '-2,-1,0,3',
    OPERATIONAL_STATUS: '1',
    // cmdb_ci operational_status choices charted by Monitored Assets, in legend order; anything else is Other.
    // Labels are fallbacks for the instance's own choice labels
    MONITORED_STATUSES: [
        { id: 'operational', value: '1', label: 'Operational' },
        { id: 'repair', value: '3', label: 'Repair in Progress' },
        { id: 'non_operational', value: '2', label: 'Non-Operational' },
        { id: 'standby', value: '4', label: 'DR Standby' },
        { id: 'ready', value: '5', label: 'Ready' }
    ],
    // Vendors given their own color in Monitored Assets; matches the vendor tones in the widget CSS
    MONITORED_VENDOR_COLORS: 6,
    RETIRED_INSTALL_STATUS: '7',
    // Scheduled, Implement - changes that are still going to happen or are in progress
    UPCOMING_CHANGE_STATES: '-2,-1',
    // Assess, Authorize, Scheduled, Implement - also lists changes still awaiting approval
    PLANNED_CHANGE_STATES: '-4,-3,-2,-1',
    // Resolved, Closed, Canceled - incidents can stay active while resolved
    INACTIVE_INCIDENT_STATES: '6,7,8',
    CONTRACT_TABLE: 'ast_contract',
    // Assets Covered related list of a contract
    CONTRACT_ASSET_TABLE: 'clm_m2m_contract_asset',
    // ast_contract state choices; an expired contract is flagged even before its end date passes,
    // and a cancelled one is never flagged
    CONTRACT_EXPIRED_STATE: 'expired',
    CONTRACT_CANCELLED_STATE: 'cancelled',
    // Share of a resolution SLA's time used at which its bar turns from green to yellow, then orange; red once breached
    SLA_WARNING_PERCENT: 50,
    SLA_CRITICAL_PERCENT: 75,
    // Higher rank wins when several records affect the same offering
    OFFERING_STATUS_RANK: {
        operational: 0,
        monitoring: 1,
        maintenance: 2,
        degraded: 3,
        outage: 4
    },
    OUTAGE_TYPE_STATUS: {
        outage: 'outage',
        degradation: 'degraded',
        planned: 'maintenance'
    },
    // cmdb_rel_ci type "Depends on::Used by"
    DEPENDS_ON_REL_TYPE: '1a9cb166f1571100a92eb60da2bce5c5',
    // Depends on hops followed below a site offering: the application service, then the technology
    // offering or infrastructure CI it uses, then the CI behind a technology offering
    IMPACT_DEPTH: 3,
    // Generic names for common session time zones; other zones show no label
    TIME_ZONE_LABELS: {
        'US/Eastern': 'ET',
        'America/New_York': 'ET',
        'US/Central': 'CT',
        'America/Chicago': 'CT',
        'US/Mountain': 'MT',
        'America/Denver': 'MT',
        'US/Arizona': 'MT',
        'America/Phoenix': 'MT',
        'US/Pacific': 'PT',
        'America/Los_Angeles': 'PT',
        'US/Alaska': 'AKT',
        'America/Anchorage': 'AKT',
        'US/Hawaii': 'HT',
        'Pacific/Honolulu': 'HT'
    },

    initialize: function () {},

    /**
     * Builds the summary cards shown by the Site Status Cards widget.
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, ciTable: string, ciFilter: string}} [options]
     * @returns {Array<{id: string, label: string, value: number, detail: string, table: string, query: string}>|null}
     *     null when the location is not found
     */
    getStatusCards: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var impactIds = Object.keys(
            this._getImpact(this._getSiteOfferings(locationIds)).byCi
        );
        return [
            this.getOutageCard(locationIds, impactIds),
            this.getIncidentCard(locationIds, impactIds),
            this.getMaintenanceCard(locationIds, impactIds),
            this.getProblemCard(locationIds, impactIds),
            this.getCICard(locationIds, options.ciTable, options.ciFilter)
        ];
    },

    /**
     * Returns the locations plus, optionally, all of their descendants.
     * @param {string} locationId - sys_id of a cmn_location record, or a comma-separated list of them
     *     (the Site Status Header's Location Preference Selector allows several)
     * @param {boolean} includeChildren
     * @returns {string[]} empty when none of the locations exist
     */
    getLocationIds: function (locationId, includeChildren) {
        // The list arrives from the client, so only well-formed sys_ids reach the query
        var requested = String(locationId || '').split(',').filter(function (id) {
            return /^[0-9a-f]{32}$/.test(id);
        });
        if (!requested.length) return [];

        var ids = [];
        var location = new GlideRecord('cmn_location');
        location.addQuery('sys_id', 'IN', requested.join(','));
        location.query();
        while (location.next()) ids.push(location.getUniqueValue());
        if (!ids.length || !includeChildren) return ids;

        // A selected location can be a descendant of another selected one, so skip ids already collected
        var seen = {};
        ids.forEach(function (id) {
            seen[id] = true;
        });
        var parents = ids;
        for (
            var depth = 0;
            depth < this.MAX_LOCATION_DEPTH && parents.length;
            depth++
        ) {
            var children = [];
            var child = new GlideRecord('cmn_location');
            child.addQuery('parent', 'IN', parents.join(','));
            child.query();
            while (child.next()) {
                var childId = child.getUniqueValue();
                if (seen[childId]) continue;
                seen[childId] = true;
                children.push(childId);
            }
            ids = ids.concat(children);
            parents = children;
        }
        return ids;
    },

    getOutageCard: function (locationIds, impactIds) {
        var now = new GlideDateTime().getValue();
        // One encoded query, so the card can link to exactly the outages it counts
        var query =
            this._ciQuery(locationIds, impactIds) +
            '^type!=planned^begin<=' +
            now +
            '^endISEMPTY^ORend>' +
            now;
        var outage = new GlideRecord('cmdb_ci_outage');
        outage.addEncodedQuery(query);
        outage.orderByDesc('begin');
        outage.query();

        var count = outage.getRowCount();
        var detail = gs.getMessage('No active outages');
        if (outage.next()) {
            var ciName = outage.cmdb_ci.getDisplayValue();
            detail =
                count > 1
                    ? gs.getMessage('{0} +{1} more', [
                          ciName,
                          String(count - 1)
                      ])
                    : ciName;
        }
        return this._card(
            'outages',
            gs.getMessage('Active Outages'),
            count,
            detail,
            'cmdb_ci_outage',
            query
        );
    },

    getIncidentCard: function (locationIds, impactIds) {
        var query =
            'active=true^' +
            this._siteTaskQuery('incident', locationIds, impactIds);
        var count = this._count('incident', query);
        var high = this._count(
            'incident',
            query + '^priorityIN' + this.HIGH_PRIORITIES
        );
        return this._card(
            'incidents',
            gs.getMessage('Open Incidents'),
            count,
            gs.getMessage('{0} high priority', [String(high)]),
            'incident',
            query
        );
    },

    getMaintenanceCard: function (locationIds, impactIds) {
        var related = this._getRelatedChangeCIs(
            locationIds,
            impactIds,
            this.MAINTENANCE_STATES
        );
        var query =
            this._siteChangeQuery(locationIds, impactIds, related) +
            '^stateIN' +
            this.MAINTENANCE_STATES +
            '^start_dateONThis week@javascript:gs.beginningOfThisWeek()@javascript:gs.endOfThisWeek()';
        var count = this._count('change_request', query);

        var detail = gs.getMessage('None scheduled');
        if (count) {
            var change = new GlideRecord('change_request');
            change.addEncodedQuery(query);
            change.addQuery('start_date', '>=', new GlideDateTime().getValue());
            change.orderBy('start_date');
            change.setLimit(1);
            change.query();
            detail = change.next()
                ? gs.getMessage('Next: {0}', [
                      this._formatShortDateTime(
                          change.start_date.getGlideObject()
                      )
                  ])
                : gs.getMessage('None upcoming');
        }
        return this._card(
            'maintenance',
            gs.getMessage('Upcoming Maintenance'),
            count,
            detail,
            'change_request',
            query
        );
    },

    getProblemCard: function (locationIds, impactIds) {
        var query =
            'active=true^' +
            this._siteTaskQuery('problem', locationIds, impactIds);
        // Same workaround test as getKnownProblems, so the card and the list agree;
        // the field can be a journal, which an encoded query cannot filter on
        var count = 0;
        var withWorkaround = 0;
        var problem = new GlideRecord('problem');
        problem.addEncodedQuery(query);
        problem.query();
        while (problem.next()) {
            count++;
            if (this._getWorkaround(problem)) withWorkaround++;
        }

        var detail;
        if (!count) detail = gs.getMessage('None reported');
        else if (withWorkaround === count)
            detail = gs.getMessage('Workarounds published');
        else if (!withWorkaround) detail = gs.getMessage('No workarounds yet');
        else
            detail = gs.getMessage('{0} of {1} have workarounds', [
                String(withWorkaround),
                String(count)
            ]);
        return this._card(
            'problems',
            gs.getMessage('Known Problems'),
            count,
            detail,
            'problem',
            query
        );
    },

    getCICard: function (locationIds, ciTable, ciFilter) {
        var query = this._monitoredQuery(locationIds, ciFilter);
        var table = this._monitoredTable(ciTable);
        var count = this._count(table, query);
        var healthy = this._count(
            table,
            query + '^operational_status=' + this.OPERATIONAL_STATUS
        );
        return this._card(
            'cis',
            gs.getMessage('Monitored Assets'),
            count,
            gs.getMessage('{0} healthy', [String(healthy)]),
            table,
            query
        );
    },

    /**
     * Monitored CIs at a site counted by class, split by operational status or vendor, used by the
     * Monitored Assets widget. Counts the same records as the Monitored Assets card.
     * @param {string} locationId - sys_id of the cmn_location record, or a comma-separated list of them
     * @param {{includeChildLocations: boolean, ciTable: string, ciFilter: string, maxClasses: number,
     *     colorBy: string}} [options] - colorBy is 'status' (default) or 'vendor'
     * @returns {{table: string, query: string, total: number, colorBy: string, vendorCount: number,
     *     series: Array<{id: string, label: string, tone: string, shape: string, count: number, query: string}>,
     *     rows: Array<{id: string, label: string, total: number, query: string,
     *         cells: Array<{seriesId: string, count: number, query: string}>}>}|null}
     *     null when the location is not found; series lists only those with records, in legend order.
     *     colorBy is what was used: vendor falls back to status unless at least two vendors are present
     */
    getMonitoredAssets: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var table = this._monitoredTable(options.ciTable);
        var query = this._monitoredQuery(locationIds, options.ciFilter);
        var maxClasses = options.maxClasses > 0 ? options.maxClasses : 6;
        var probe = new GlideRecord(table);
        // A non-CMDB table has no operational status, so every record lands in Other
        var hasStatus = probe.isValidField('operational_status');
        var hasVendor = probe.isValidField('vendor');

        // One pass grouped by everything either split needs, so the vendor count comes for free
        var entries = [];
        var vendorIds = {};
        var vendorCount = 0;
        var agg = new GlideAggregate(table);
        agg.addEncodedQuery(query);
        agg.groupBy('sys_class_name');
        if (hasStatus) agg.groupBy('operational_status');
        if (hasVendor) agg.groupBy('vendor');
        agg.addAggregate('COUNT');
        agg.query();
        // GlideAggregate.getElement is blocked in scoped apps, so labels are resolved by
        // setting each grouped value on the probe record and reading its display value
        var labels = {};
        function labelFor(field, value) {
            if (!value) return '';
            var key = field + ':' + value;
            if (!labels.hasOwnProperty(key)) {
                probe.setValue(field, value);
                labels[key] = String(probe.getDisplayValue(field) || value);
            }
            return labels[key];
        }
        while (agg.next()) {
            var classId = agg.getValue('sys_class_name') || '';
            var status = hasStatus ? agg.getValue('operational_status') || '' : '';
            var vendor = hasVendor ? agg.getValue('vendor') || '' : '';
            var entry = {
                classId: classId,
                classLabel: labelFor('sys_class_name', classId),
                status: status,
                statusLabel: labelFor('operational_status', status),
                vendor: vendor,
                vendorLabel: labelFor('vendor', vendor),
                count: parseInt(agg.getAggregate('COUNT'), 10) || 0
            };
            if (entry.vendor && !vendorIds[entry.vendor]) {
                vendorIds[entry.vendor] = true;
                vendorCount++;
            }
            entries.push(entry);
        }

        // Vendor colors only tell users something when there are at least two vendors to tell apart
        var colorBy =
            options.colorBy === 'vendor' && vendorCount > 1 ? 'vendor' : 'status';
        var split =
            colorBy === 'vendor'
                ? this._vendorSeries(entries)
                : this._statusSeries(entries);

        var rows = [];
        var rowById = {};
        var total = 0;
        entries.forEach(function (entry) {
            var seriesId = split.idFor(entry);
            var row = rowById[entry.classId];
            if (!row) {
                row = {
                    id: entry.classId,
                    label: entry.classLabel || entry.classId,
                    total: 0,
                    counts: {},
                    filter: entry.classId
                        ? 'sys_class_name=' + entry.classId
                        : 'sys_class_nameISEMPTY'
                };
                rowById[entry.classId] = row;
                rows.push(row);
            }
            row.counts[seriesId] = (row.counts[seriesId] || 0) + entry.count;
            row.total += entry.count;
            split.byId[seriesId].count += entry.count;
            total += entry.count;
        });

        rows.sort(function (a, b) {
            return b.total - a.total || (a.label < b.label ? -1 : 1);
        });
        // Smaller classes fold into one row so the bar chart stays readable
        if (rows.length > maxClasses) {
            var kept = rows.slice(0, maxClasses);
            var otherClasses = {
                id: 'other',
                label: gs.getMessage('Other classes'),
                total: 0,
                counts: {},
                filter:
                    'sys_class_nameNOT IN' +
                    kept
                        .map(function (row) {
                            return row.id;
                        })
                        .join(',')
            };
            rows.slice(maxClasses).forEach(function (row) {
                otherClasses.total += row.total;
                for (var id in row.counts)
                    otherClasses.counts[id] =
                        (otherClasses.counts[id] || 0) + row.counts[id];
            });
            rows = kept.concat(otherClasses);
        }

        var present = split.list.filter(function (series) {
            return series.count > 0;
        });
        return {
            table: table,
            query: query,
            total: total,
            colorBy: colorBy,
            vendorCount: vendorCount,
            series: present.map(function (series) {
                return {
                    id: series.id,
                    label: series.label,
                    tone: series.tone,
                    shape: series.shape,
                    count: series.count,
                    query: query + '^' + series.filter
                };
            }),
            rows: rows.map(function (row) {
                var rowQuery = query + '^' + row.filter;
                return {
                    id: row.id,
                    label: row.label,
                    total: row.total,
                    query: rowQuery,
                    // One cell per listed series, in legend order, so the views can line them up
                    cells: present.map(function (series) {
                        return {
                            seriesId: series.id,
                            count: row.counts[series.id] || 0,
                            query: rowQuery + '^' + series.filter
                        };
                    })
                };
            })
        };
    },

    // Operational status series for Monitored Assets, in MONITORED_STATUSES order with Other last
    _statusSeries: function (entries) {
        var list = [];
        var byId = {};
        var idByValue = {};
        var knownValues = [];
        this.MONITORED_STATUSES.forEach(function (definition) {
            var series = {
                id: definition.id,
                label: '',
                fallbackLabel: definition.label,
                tone: definition.id,
                shape: definition.id,
                count: 0,
                filter: 'operational_status=' + definition.value
            };
            list.push(series);
            byId[series.id] = series;
            idByValue[definition.value] = series.id;
            knownValues.push(definition.value);
        });
        var other = {
            id: 'other',
            label: gs.getMessage('Other'),
            tone: 'other',
            shape: 'other',
            count: 0,
            // NOT IN leaves out records with no status, so those are added back
            filter:
                'operational_statusNOT IN' +
                knownValues.join(',') +
                '^ORoperational_statusISEMPTY'
        };
        list.push(other);
        byId.other = other;

        entries.forEach(function (entry) {
            var series = byId[idByValue[entry.status] || 'other'];
            // The instance's own choice label, so renamed choices read the same as on the form
            if (!series.label && entry.statusLabel)
                series.label = entry.statusLabel;
        });
        list.forEach(function (series) {
            if (!series.label) series.label = gs.getMessage(series.fallbackLabel);
        });
        return {
            list: list,
            byId: byId,
            idFor: function (entry) {
                return idByValue[entry.status] || 'other';
            }
        };
    },

    // Vendor series for Monitored Assets: the largest vendors each get a color, the rest share Other vendors
    // and CIs without a vendor come last. Colors follow the vendor's rank at this site
    _vendorSeries: function (entries) {
        var totals = {};
        var vendors = [];
        entries.forEach(function (entry) {
            if (!entry.vendor) return;
            if (!totals[entry.vendor]) {
                totals[entry.vendor] = { id: entry.vendor, label: entry.vendorLabel || entry.vendor, total: 0 };
                vendors.push(totals[entry.vendor]);
            }
            totals[entry.vendor].total += entry.count;
        });
        vendors.sort(function (a, b) {
            return b.total - a.total || (a.label < b.label ? -1 : 1);
        });

        var list = [];
        var byId = {};
        var kept = vendors.slice(0, this.MONITORED_VENDOR_COLORS);
        kept.forEach(function (vendor, index) {
            var series = {
                id: vendor.id,
                label: vendor.label,
                tone: 'vendor-' + (index + 1),
                shape: 'swatch',
                count: 0,
                filter: 'vendor=' + vendor.id
            };
            list.push(series);
            byId[series.id] = series;
        });
        var keptIds = kept.map(function (vendor) {
            return vendor.id;
        });
        // NOT IN also leaves out CIs with no vendor, which have their own series
        byId.other = {
            id: 'other',
            label: gs.getMessage('Other vendors'),
            tone: 'other',
            shape: 'swatch',
            count: 0,
            filter: 'vendorISNOTEMPTY^vendorNOT IN' + keptIds.join(',')
        };
        byId.none = {
            id: 'none',
            label: gs.getMessage('No vendor'),
            tone: 'none',
            shape: 'none',
            count: 0,
            filter: 'vendorISEMPTY'
        };
        list.push(byId.other, byId.none);
        return {
            list: list,
            byId: byId,
            idFor: function (entry) {
                if (!entry.vendor) return 'none';
                return byId[entry.vendor] ? entry.vendor : 'other';
            }
        };
    },

    /**
     * Status definitions in legend order, used by the Service Offerings widget.
     * description is the plain-language legend tooltip.
     * @returns {Array<{id: string, label: string, description: string}>}
     */
    getOfferingStatuses: function () {
        return [
            {
                id: 'operational',
                label: gs.getMessage('Operational'),
                description: gs.getMessage('Working normally. No known issues.')
            },
            {
                id: 'degraded',
                label: gs.getMessage('Degraded'),
                description: gs.getMessage('Available, but slower or partly unavailable.')
            },
            {
                id: 'outage',
                label: gs.getMessage('Outage'),
                description: gs.getMessage('Down. The service is not available.')
            },
            {
                id: 'maintenance',
                label: gs.getMessage('Maintenance'),
                description: gs.getMessage('Planned work is underway or coming up soon.')
            },
            {
                id: 'monitoring',
                label: gs.getMessage('Monitoring'),
                description: gs.getMessage('Working, but an open issue is being looked into.')
            }
        ];
    },

    /**
     * Service offerings at a site with their current status, most severe first.
     * Outages beat maintenance, which beats open incidents (monitoring); known
     * problems only add a note to an otherwise operational offering.
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, filter: string, limit: number, maintenanceDays: number}} [options]
     * @returns {Array<{id: string, name: string, status: string, statusLabel: string, detail: string, summary: string,
     *     when: string, via: string}>|null} null when the location is not found; detail is the one-line text, while
     *     summary, when and via are its parts for widgets that lay them out separately
     */
    getServiceOfferings: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var offerings = [];
        var offeringsById = {};
        var offering = new GlideRecordSecure('service_offering');
        offering.addEncodedQuery(this._siteOfferingQuery(locationIds));
        offering.addQuery('install_status', '!=', this.RETIRED_INSTALL_STATUS);
        if (options.filter) offering.addEncodedQuery(options.filter);
        offering.orderBy('name');
        offering.setLimit(options.limit || 50);
        offering.query();
        while (offering.next()) {
            var item = {
                id: offering.getUniqueValue(),
                name: offering.getDisplayValue('name'),
                status: 'operational',
                detail: gs.getMessage('No issues reported'),
                summary: gs.getMessage('No issues reported'),
                when: '',
                via: '',
                explained: false
            };
            offerings.push(item);
            offeringsById[item.id] = item;
        }
        if (!offerings.length) return offerings;

        var names = {};
        offerings.forEach(function (item) {
            names[item.id] = item.name;
        });
        var impact = this._getImpact(names);
        this._applyKnownProblems(offeringsById, impact);
        this._applyIncidents(offeringsById, impact);
        this._applyMaintenance(
            offeringsById,
            impact,
            options.maintenanceDays || 7
        );
        this._applyOutages(offeringsById, impact);

        var labels = {};
        this.getOfferingStatuses().forEach(function (status) {
            labels[status.id] = status.label;
        });
        var rank = this.OFFERING_STATUS_RANK;
        offerings.forEach(function (item) {
            item.statusLabel = labels[item.status];
            delete item.explained;
        });
        // Array.sort is not guaranteed stable on the server, so break ties by name
        return offerings.sort(function (a, b) {
            return (
                rank[b.status] - rank[a.status] ||
                (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
            );
        });
    },

    /**
     * Maintenance at a site that is in progress or starts within the next few days, soonest first: change requests
     * at the site, plus occurrences of maintenance schedules that cover a CI at the site or a CI a site offering
     * depends on.
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, days: number, limit: number, impactField: string}} [options]
     * @returns {Array<{id: string, number: string, title: string, impact: string, weekday: string, dayOfMonth: string,
     *     dateLabel: string, time: string, start: string, end: string, inProgress: boolean}>|null} null when the location is not found
     */
    getMaintenanceWindows: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var now = new GlideDateTime();
        var horizon = new GlideDateTime();
        horizon.addDaysUTC(options.days || 7);
        var limit = options.limit || 10;

        var impact = this._getImpact(this._getSiteOfferings(locationIds));
        var impactIds = Object.keys(impact.byCi);
        var related = this._getRelatedChangeCIs(
            locationIds,
            impactIds,
            this.UPCOMING_CHANGE_STATES
        );

        var change = new GlideRecordSecure('change_request');
        change.addEncodedQuery(
            this._siteChangeQuery(locationIds, impactIds, related)
        );
        change.addQuery('state', 'IN', this.UPCOMING_CHANGE_STATES);
        change.addQuery('start_date', '<=', horizon.getValue());
        change.addQuery('end_date', '>', now.getValue());
        change.orderBy('start_date');
        change.setLimit(limit);
        change.query();

        // An unknown field would throw on getDisplayValue, so the impact line is dropped instead
        var impactField =
            options.impactField && change.isValidField(options.impactField)
                ? options.impactField
                : '';
        var zone = this._getTimeZoneLabel();
        var windows = [];
        while (change.next()) {
            windows.push(
                this._window({
                    id: change.getUniqueValue(),
                    table: 'change_request',
                    sysId: change.getUniqueValue(),
                    number: change.getValue('number'),
                    // Friendly name first; changes without one keep the short description
                    title:
                        change.getValue('u_friendly_name') ||
                        change.getValue('short_description') ||
                        change.getValue('number'),
                    // Falls back to the site offerings the change affects
                    impact:
                        (impactField
                            ? change.getDisplayValue(impactField)
                            : '') ||
                        this._describeAffected(
                            this._getAffectedOfferings(
                                change,
                                impact,
                                related[change.getUniqueValue()]
                            ),
                            impact
                        ),
                    start: new GlideDateTime(change.getValue('start_date')),
                    end: new GlideDateTime(change.getValue('end_date')),
                    now: now,
                    zone: zone
                })
            );
        }

        windows = windows.concat(
            this._getScheduleWindows(locationIds, impactIds, now, horizon, zone)
        );
        // Array.sort is not guaranteed stable on the server, so break ties by id
        windows.sort(function (a, b) {
            return a.start < b.start
                ? -1
                : a.start > b.start
                  ? 1
                  : a.id < b.id
                    ? -1
                    : 1;
        });
        return windows.slice(0, limit);
    },

    // One maintenance window list item; start and end are GlideDateTime
    _window: function (item) {
        return {
            id: item.id,
            // The record the title links to
            table: item.table,
            sysId: item.sysId,
            number: item.number,
            title: item.title,
            impact: item.impact || '',
            weekday: this._formatDay(item.start),
            dayOfMonth: item.start.getLocalDate().getByFormat('d'),
            dateLabel: item.start.getLocalDate().getByFormat('EEEE, MMMM d'),
            time: this._formatTimeRange(item.start, item.end, item.zone),
            // UTC values for the calendar download
            start: item.start.getValue(),
            end: item.end.getValue(),
            inProgress: item.start.compareTo(item.now) <= 0
        };
    },

    // Occurrences between now and horizon of the maintenance schedules that cover the site
    _getScheduleWindows: function (locationIds, impactIds, now, horizon, zone) {
        var windows = [];
        var schedules = this._getMaintenanceSchedules(locationIds, impactIds);
        Object.keys(schedules).forEach(function (scheduleId) {
            var info = schedules[scheduleId];
            try {
                // A schedule without a time zone floats in the session user's time zone
                var schedule = new GlideSchedule(
                    scheduleId,
                    info.timeZone || gs.getSession().getTimeZoneName()
                );
                var spans = schedule.getTimeMap(now, horizon);
                while (spans.hasNext()) {
                    var span = spans.next();
                    var start = span.getStart().getGlideDateTime();
                    windows.push(
                        this._window({
                            id: scheduleId + '-' + start.getValue(),
                            table: info.table,
                            sysId: scheduleId,
                            number: gs.getMessage('Maintenance schedule'),
                            title: info.name,
                            impact: '',
                            start: start,
                            end: span.getEnd().getGlideDateTime(),
                            now: now,
                            zone: zone
                        })
                    );
                }
            } catch (e) {
                gs.warn(
                    'SiteStatusUtility: could not read maintenance schedule ' +
                        scheduleId +
                        ': ' +
                        e
                );
            }
        }, this);
        return windows;
    },

    // Maintenance schedules (by sys_id) whose condition matches, or that are set on, a CI at one of the
    // locations or a CI a site offering depends on, as {sys_id: {name, timeZone, table}}
    _getMaintenanceSchedules: function (locationIds, impactIds) {
        var scope = 'locationIN' + locationIds.join(',');
        if (impactIds.length) scope += '^ORsys_idIN' + impactIds.join(',');
        var schedules = {};
        var add = function (schedule) {
            // Friendly name first; schedules without one (or whose table lacks the field) keep their name
            var friendlyName = schedule.isValidField('u_friendly_name')
                ? schedule.getDisplayValue('u_friendly_name')
                : '';
            schedules[schedule.getUniqueValue()] = {
                name: friendlyName || schedule.getDisplayValue('name'),
                timeZone: schedule.getValue('time_zone') || '',
                table: schedule.getRecordClassName()
            };
        };

        // Conditional schedules, as used by change conflict detection
        var conditional = new GlideRecordSecure('cmn_schedule_maintenance');
        conditional.addNotNullQuery('applies_to');
        conditional.query();
        while (conditional.next()) {
            var target = new GlideRecord(conditional.getValue('applies_to'));
            if (!target.isValid() || !target.isValidField('location')) continue;
            // Narrow every top-level OR (^NQ) group of the condition to the site
            var condition = (conditional.getValue('condition') || '').replace(
                /\^EQ/g,
                ''
            );
            target.addEncodedQuery(
                condition
                    .split('^NQ')
                    .map(function (group) {
                        return group ? group + '^' + scope : scope;
                    })
                    .join('^NQ')
            );
            target.setLimit(1);
            target.query();
            if (target.hasNext()) add(conditional);
        }

        // Schedules set directly on a CI
        var ci = new GlideAggregate('cmdb_ci');
        ci.addEncodedQuery(scope);
        ci.addNotNullQuery('maintenance_schedule');
        ci.groupBy('maintenance_schedule');
        ci.query();
        while (ci.next()) {
            var schedule = new GlideRecordSecure('cmn_schedule');
            if (!schedule.get(ci.getValue('maintenance_schedule'))) continue;
            // Reload from the schedule's own table so fields added there, like u_friendly_name, are readable
            var className = schedule.getRecordClassName();
            if (className !== 'cmn_schedule') {
                var full = new GlideRecordSecure(className);
                if (full.get(schedule.getUniqueValue())) schedule = full;
            }
            add(schedule);
        }
        return schedules;
    },

    /**
     * Change requests at a site, from assessment through implementation, that are in progress or
     * start within the next few days, soonest first. A change is at the site when it is logged against
     * the location, a CI at the location, or a CI a site offering depends on (directly or as an affected
     * CI or impacted service).
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, days: number, limit: number, states: string, filter: string}} [options]
     * @returns {Array<{id: string, number: string, title: string, service: string, start: string,
     *     startLabel: string, state: string, risk: string}>|null} null when the location is not found
     */
    getUpcomingChanges: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var now = new GlideDateTime();
        var horizon = new GlideDateTime();
        horizon.addDaysUTC(options.days || 14);
        var states = options.states || this.PLANNED_CHANGE_STATES;

        var impact = this._getImpact(this._getSiteOfferings(locationIds));
        var impactIds = Object.keys(impact.byCi);
        var related = this._getRelatedChangeCIs(locationIds, impactIds, states);

        var change = new GlideRecordSecure('change_request');
        change.addEncodedQuery(
            this._siteChangeQuery(locationIds, impactIds, related)
        );
        change.addQuery('state', 'IN', states);
        change.addQuery('start_date', '<=', horizon.getValue());
        change.addEncodedQuery('end_dateISEMPTY^ORend_date>' + now.getValue());
        if (options.filter) change.addEncodedQuery(options.filter);
        change.orderBy('start_date');
        change.setLimit(options.limit || 10);
        change.query();

        var changes = [];
        while (change.next()) {
            var start = new GlideDateTime(change.getValue('start_date'));
            changes.push({
                id: change.getUniqueValue(),
                number: change.getValue('number'),
                title:
                    change.getValue('short_description') ||
                    change.getValue('number'),
                service: this._getChangeService(
                    change,
                    impact,
                    related[change.getUniqueValue()]
                ),
                // ISO 8601 UTC value for a machine-readable <time> element
                start: start.getValue().replace(' ', 'T') + 'Z',
                startLabel:
                    start.getLocalDate().getByFormat('EEE MMM d') +
                    ', ' +
                    start.getLocalTime().getByFormat('h:mm a'),
                state: change.getDisplayValue('state'),
                risk: change.getDisplayValue('risk')
            });
        }
        return changes;
    },

    // Affected CIs (task_ci) and impacted services (task_cmdb_ci_service) of changes in the given states that
    // are at one of the locations or that a site offering depends on, as {changeId: [{id, name}]}
    _getRelatedChangeCIs: function (locationIds, impactIds, states) {
        var related = {};
        [
            { table: 'task_ci', field: 'ci_item' },
            { table: 'task_cmdb_ci_service', field: 'cmdb_ci_service' }
        ].forEach(function (source) {
            var link = new GlideRecord(source.table);
            if (!link.isValid()) return;
            var conditions = [];
            if (locationIds.length)
                conditions.push(
                    source.field + '.locationIN' + locationIds.join(',')
                );
            if (impactIds.length)
                conditions.push(source.field + 'IN' + impactIds.join(','));
            if (!conditions.length) return;
            link.addEncodedQuery(conditions.join('^OR'));
            link.addQuery('task.sys_class_name', 'change_request');
            link.addQuery('task.state', 'IN', states);
            link.query();
            while (link.next()) {
                var changeId = link.getValue('task');
                (related[changeId] = related[changeId] || []).push({
                    id: link.getValue(source.field),
                    name: link.getDisplayValue(source.field)
                });
            }
        });
        return related;
    },

    // Changes at the site (see _siteTaskQuery) or with a related CI from _getRelatedChangeCIs
    _siteChangeQuery: function (locationIds, impactIds, related) {
        var query = this._siteTaskQuery(
            'change_request',
            locationIds,
            impactIds
        );
        var relatedIds = Object.keys(related);
        if (relatedIds.length) query += '^ORsys_idIN' + relatedIds.join(',');
        return query;
    },

    // The site offerings the change affects, otherwise the most specific service it names:
    // the offering, then the business service, then the CI
    _getChangeService: function (change, impact, relatedCis) {
        var affected = this._describeAffected(
            this._getAffectedOfferings(change, impact, relatedCis),
            impact
        );
        if (affected) return affected;
        var fields = ['service_offering', 'business_service', 'cmdb_ci'];
        for (var i = 0; i < fields.length; i++) {
            if (change.isValidField(fields[i]) && change.getValue(fields[i]))
                return change.getDisplayValue(fields[i]);
        }
        return '';
    },

    /**
     * Active problems at a site with their workaround and published knowledge article, most urgent first.
     * Uses the same site match as the Known problems card so the list and the count agree.
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, filter: string, limit: number}} [options]
     * @returns {Array<{id: string, number: string, title: string, state: string, affects: string, workaround: string,
     *     article: {id: string, number: string}|null}>|null} null when the location is not found
     */
    getKnownProblems: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var impact = this._getImpact(this._getSiteOfferings(locationIds));
        var problem = new GlideRecord('problem');
        problem.addEncodedQuery(
            'active=true^' +
                this._siteTaskQuery(
                    'problem',
                    locationIds,
                    Object.keys(impact.byCi)
                )
        );
        if (options.filter) problem.addEncodedQuery(options.filter);
        problem.orderBy('priority');
        problem.orderByDesc('opened_at');
        problem.setLimit(options.limit || 10);
        problem.query();

        var problems = [];
        var problemsById = {};
        while (problem.next()) {
            var item = {
                id: problem.getUniqueValue(),
                number: problem.getValue('number'),
                title:
                    problem.getValue('short_description') ||
                    problem.getValue('number'),
                state: problem.getDisplayValue('state'),
                // Site offerings the problem reaches through its CI or service offering
                affects: this._describeAffected(
                    this._getAffectedOfferings(problem, impact),
                    impact
                ),
                workaround: this._getWorkaround(problem),
                article: null
            };
            problems.push(item);
            problemsById[item.id] = item;
        }
        if (problems.length) this._applyKnowledgeArticles(problemsById);
        return problems;
    },

    /**
     * Lists the contracts shown by the Service Contracts widget: contracts located at the site and,
     * optionally, contracts covering an asset at the site.
     * @param {string} locationId - sys_id of a cmn_location record, or a comma-separated list of them
     * @param {{includeChildLocations: boolean, includeCoveredAssets: boolean, filter: string,
     *     limit: number, expiringDays: number}} [options]
     * @returns {{contracts: Array<Object>, table: string, query: string, truncated: boolean}|null}
     *     null when the location is not found. Each contract's expiry is 'expired', 'expiring' or ''
     *     and daysLeft is negative once the end date has passed
     */
    getServiceContracts: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var result = {
            contracts: [],
            table: this.CONTRACT_TABLE,
            query: '',
            truncated: false
        };
        var siteQueries = [];
        if (new GlideRecord(this.CONTRACT_TABLE).isValidField('location'))
            siteQueries.push('locationIN' + locationIds.join(','));
        if (options.includeCoveredAssets !== false) {
            var covered = this._getContractsCoveringAssets(locationIds);
            if (covered.length) siteQueries.push('sys_idIN' + covered.join(','));
        }
        if (!siteQueries.length) return result;
        // ^OR binds tighter than ^, so the filter narrows both site matches
        result.query = siteQueries.join('^OR');
        if (options.filter) result.query += '^' + options.filter;

        var limit = options.limit > 0 ? options.limit : 200;
        var expiringDays = options.expiringDays >= 0 ? options.expiringDays : 30;
        var today = new GlideDateTime().getLocalDate().getValue();

        var contract = new GlideRecordSecure(this.CONTRACT_TABLE);
        contract.addEncodedQuery(result.query);
        contract.orderBy('ends');
        // One extra row tells the widget the list was cut short
        contract.setLimit(limit + 1);
        contract.query();
        while (contract.next()) {
            if (result.contracts.length === limit) {
                result.truncated = true;
                break;
            }
            if (!contract.canRead()) continue;
            var stateValue = this._readable(contract, 'state', true);
            // A date_time end is cut to its date; glide_date values are already yyyy-MM-dd
            var endsValue = this._readable(contract, 'ends', true).substring(0, 10);
            var daysLeft = endsValue ? this._daysBetween(today, endsValue) : null;
            result.contracts.push({
                id: contract.getUniqueValue(),
                number: this._readable(contract, 'number'),
                name:
                    this._readable(contract, 'name') ||
                    this._readable(contract, 'short_description') ||
                    this._readable(contract, 'number'),
                model: this._readable(contract, 'contract_model'),
                state: this._readable(contract, 'state'),
                stateValue: stateValue,
                ends: this._readable(contract, 'ends'),
                endsValue: endsValue,
                owner: this._readable(contract, 'business_owner'),
                daysLeft: daysLeft,
                expiry: this._contractExpiry(stateValue, daysLeft, expiringDays),
                assetCount: 0
            });
        }
        this._applyCoveredAssetCounts(result.contracts);
        return result;
    },

    _contractExpiry: function (stateValue, daysLeft, expiringDays) {
        if (stateValue === this.CONTRACT_CANCELLED_STATE) return '';
        if (stateValue === this.CONTRACT_EXPIRED_STATE) return 'expired';
        if (daysLeft === null) return '';
        if (daysLeft < 0) return 'expired';
        return daysLeft <= expiringDays ? 'expiring' : '';
    },

    // Contracts with an asset at one of the locations; empty when Contract Management's asset table is missing
    _getContractsCoveringAssets: function (locationIds) {
        var ids = [];
        var link = new GlideAggregate(this.CONTRACT_ASSET_TABLE);
        if (!link.isValid()) return ids;
        link.addQuery('asset.location', 'IN', locationIds.join(','));
        link.groupBy('contract');
        link.query();
        while (link.next()) {
            var contractId = link.getValue('contract');
            if (contractId) ids.push(contractId);
        }
        return ids;
    },

    _applyCoveredAssetCounts: function (contracts) {
        if (!contracts.length) return;
        var link = new GlideAggregate(this.CONTRACT_ASSET_TABLE);
        if (!link.isValid()) return;
        var byId = {};
        contracts.forEach(function (item) {
            byId[item.id] = item;
        });
        link.addQuery('contract', 'IN', Object.keys(byId).join(','));
        link.addAggregate('COUNT');
        link.groupBy('contract');
        link.query();
        while (link.next()) {
            var item = byId[link.getValue('contract')];
            if (item) item.assetCount = parseInt(link.getAggregate('COUNT'), 10) || 0;
        }
    },

    // Whole days from one yyyy-MM-dd date to another; negative when the second is earlier
    _daysBetween: function (from, to) {
        var toUtc = function (ymd) {
            var parts = ymd.split('-');
            return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        };
        return Math.round((toUtc(to) - toUtc(from)) / (24 * 60 * 60 * 1000));
    },

    // ACL-aware field read: raw=true reads the value, otherwise the display value; '' when missing or unreadable
    _readable: function (record, name, raw) {
        if (!record.isValidField(name)) return '';
        var element = record.getElement(name);
        if (!element || !element.canRead()) return '';
        return String((raw ? record.getValue(name) : record.getDisplayValue(name)) || '');
    },

    // Workaround is a plain/HTML field on most releases and a journal on some; either way return plain text
    _getWorkaround: function (problem) {
        if (!problem.isValidField('workaround')) return '';
        var element = problem.getElement('workaround');
        var type = String(element.getED().getInternalType());
        var text =
            type.indexOf('journal') === 0
                ? // Newest entry, minus its "date - user (Workaround)" header line
                  String(element.getJournalEntry(1) || '').replace(/^.*\n/, '')
                : String(problem.getValue('workaround') || '');
        return text
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Newest published article per problem the user can read, from the article's source task or the m2m_kb_task relation
    _applyKnowledgeArticles: function (problemsById) {
        var ids = Object.keys(problemsById).join(',');
        var setArticle = function (problemId, article) {
            var item = problemsById[problemId];
            if (item && !item.article && article.canRead())
                item.article = {
                    id: article.getUniqueValue(),
                    number: article.getValue('number')
                };
        };

        var article = new GlideRecord('kb_knowledge');
        if (article.isValidField('source')) {
            article.addQuery('source', 'IN', ids);
            article.addQuery('workflow_state', 'published');
            article.orderByDesc('published');
            article.query();
            while (article.next())
                setArticle(article.getValue('source'), article);
        }

        var link = new GlideRecord('m2m_kb_task');
        if (!link.isValid()) return;
        link.addQuery('task', 'IN', ids);
        link.addQuery('kb_knowledge.workflow_state', 'published');
        link.orderByDesc('kb_knowledge.published');
        link.query();
        while (link.next()) {
            var linked = link.kb_knowledge.getRefRecord();
            if (linked.isValidRecord())
                setArticle(link.getValue('task'), linked);
        }
    },

    /**
     * Current unplanned outages and active incidents at a site: outages first (outage before degraded), then by
     * priority, then newest. An outage linked to a listed incident is shown on that incident; other outages are
     * listed on their own. Uses the same site match as the Active outages and Open incidents cards so the list
     * and the counts agree.
     * @param {string} locationId - sys_id of the cmn_location record
     * @param {{includeChildLocations: boolean, filter: string, limit: number}} [options] - filter narrows incidents only
     * @returns {Array<{id: string, table: string, number: string, title: string, status: string, statusLabel: string,
     *     priority: string, major: string, state: string, affects: string, detail: string, group: string, since: string,
     *     sinceLabel: string, sla: {name: string, percent: number, level: string, timeLabel: string,
     *     valueText: string}|null}>|null} null when the location is not found
     */
    getIncidentsAndOutages: function (locationId, options) {
        options = options || {};
        var locationIds = this.getLocationIds(
            locationId,
            options.includeChildLocations !== false
        );
        if (!locationIds.length) return null;

        var limit = options.limit || 10;
        var impact = this._getImpact(this._getSiteOfferings(locationIds));
        var impactIds = Object.keys(impact.byCi);
        var outages = this._getActiveOutages(locationIds, impactIds, impact);

        // The most severe outage per linked task; outages arrive newest first
        var rank = this.OFFERING_STATUS_RANK;
        var outagesByTask = {};
        outages.forEach(function (outage) {
            var known = outagesByTask[outage.taskId];
            if (outage.taskId && (!known || rank[outage.status] > rank[known.status]))
                outagesByTask[outage.taskId] = outage;
        });

        // Incidents behind a site outage are listed even when logged elsewhere
        var query =
            'active=true^' +
            this._siteTaskQuery('incident', locationIds, impactIds);
        var taskIds = Object.keys(outagesByTask);
        if (taskIds.length) query += '^ORsys_idIN' + taskIds.join(',');

        var incident = new GlideRecord('incident');
        incident.addEncodedQuery(query);
        if (options.filter) incident.addEncodedQuery(options.filter);
        incident.orderBy('priority');
        incident.orderByDesc('opened_at');
        incident.setLimit(limit);
        incident.query();

        var items = [];
        var listed = {};
        while (incident.next()) {
            var id = incident.getUniqueValue();
            var outage = outagesByTask[id];
            var priority = incident.getValue('priority');
            listed[id] = true;
            items.push(
                this._incidentOutageItem({
                    id: id,
                    table: 'incident',
                    number: incident.getValue('number'),
                    title:
                        incident.getValue('short_description') ||
                        incident.getValue('number'),
                    status: outage ? outage.status : '',
                    priority: priority,
                    priorityLabel: priority
                        ? gs.getMessage('P{0}', [priority])
                        : '',
                    state: incident.getDisplayValue('state'),
                    affects:
                        this._describeAffected(
                            this._getAffectedOfferings(incident, impact),
                            impact
                        ) ||
                        (outage ? outage.affects : '') ||
                        incident.getDisplayValue('cmdb_ci'),
                    // The outage message is written for the people affected, so it wins over the description
                    detail:
                        (outage ? outage.message : '') ||
                        incident.getValue('description'),
                    group: incident.getDisplayValue('assignment_group'),
                    since: new GlideDateTime(incident.getValue('opened_at')),
                    sinceMessage: 'Opened {0}'
                })
            );
        }

        outages.forEach(function (outage) {
            if (!outage.taskId || !listed[outage.taskId]) {
                // Only the first outage per unlisted task, so one task is not listed twice
                if (outage.taskId) listed[outage.taskId] = true;
                items.push(this._incidentOutageItem(outage));
            }
        }, this);

        // Array.sort is not guaranteed stable on the server, so break ties by id
        items.sort(function (a, b) {
            return (
                (rank[b.status] || 0) - (rank[a.status] || 0) ||
                a._priority - b._priority ||
                b._since - a._since ||
                (a.id < b.id ? -1 : 1)
            );
        });
        items = items.slice(0, limit).map(function (item) {
            delete item._priority;
            delete item._since;
            return item;
        });
        this._applyResolutionSlas(items);
        return items;
    },

    // Sets sla on listed incidents from their in-progress resolution SLA; the one due soonest when there are several
    _applyResolutionSlas: function (items) {
        var itemsById = {};
        items.forEach(function (item) {
            if (item.table === 'incident') itemsById[item.id] = item;
        });
        var ids = Object.keys(itemsById);
        if (!ids.length) return;

        var sla = new GlideRecord('task_sla');
        sla.addQuery('task', 'IN', ids.join(','));
        sla.addQuery('stage', 'in_progress');
        sla.addQuery('sla.type', 'SLA');
        sla.addQuery('sla.target', 'resolution');
        sla.orderBy('planned_end_time');
        sla.query();

        var now = new GlideDateTime().getNumericValue();
        while (sla.next()) {
            var item = itemsById[sla.getValue('task')];
            if (!item || item.sla) continue;

            var due = sla.getValue('planned_end_time');
            // time_left is only refreshed by the SLA job, so time left is worked out from the breach time
            var remaining = due ? new GlideDateTime(due).getNumericValue() - now : 0;
            var used = parseFloat(sla.getValue('business_percentage')) || 0;
            var breached = String(sla.has_breached) === 'true' || used >= 100 || (!!due && remaining <= 0);
            var percent = breached ? 100 : Math.min(99, Math.max(0, Math.round(used)));
            var timeLabel = !due
                ? ''
                : breached
                  ? gs.getMessage('{0} overdue', [this._formatDuration(-remaining)])
                  : gs.getMessage('{0} left', [this._formatDuration(remaining)]);

            item.sla = {
                name: sla.sla.getDisplayValue(),
                percent: percent,
                level: breached
                    ? 'breached'
                    : used >= this.SLA_CRITICAL_PERCENT
                      ? 'critical'
                      : used >= this.SLA_WARNING_PERCENT
                        ? 'warning'
                        : 'ok',
                timeLabel: timeLabel,
                // Spoken by screen readers in place of the bar
                valueText: timeLabel
                    ? gs.getMessage('{0}% of time used, {1}', [String(percent), timeLabel])
                    : gs.getMessage('{0}% of time used', [String(percent)])
            };
        }
    },

    // e.g. "2d 3h", "1h 12m", "12m" or "<1m"
    _formatDuration: function (ms) {
        var minutes = Math.floor(Math.max(0, ms) / 60000);
        if (minutes < 1) return gs.getMessage('<1m');
        var days = Math.floor(minutes / 1440);
        var hours = Math.floor((minutes % 1440) / 60);
        minutes = minutes % 60;
        if (days) return days + 'd' + (hours ? ' ' + hours + 'h' : '');
        if (hours) return hours + 'h' + (minutes ? ' ' + minutes + 'm' : '');
        return minutes + 'm';
    },

    // Current unplanned outages on CIs at the site (as counted by the Active outages card), newest first
    _getActiveOutages: function (locationIds, impactIds, impact) {
        var now = new GlideDateTime().getValue();
        var outage = new GlideRecord('cmdb_ci_outage');
        outage.addEncodedQuery(this._ciQuery(locationIds, impactIds));
        outage.addQuery('type', '!=', 'planned');
        outage.addQuery('begin', '<=', now);
        outage.addEncodedQuery('endISEMPTY^ORend>' + now);
        outage.orderByDesc('begin');
        outage.query();

        var hasTask = outage.isValidField('task_number');
        var hasTitle = outage.isValidField('short_description');
        var outages = [];
        while (outage.next()) {
            var ciName = outage.cmdb_ci.getDisplayValue();
            var message = outage.getValue('message') || '';
            var title =
                (hasTitle ? outage.getValue('short_description') : '') ||
                message ||
                gs.getMessage('{0} outage', [ciName]);
            outages.push({
                id: outage.getUniqueValue(),
                table: 'cmdb_ci_outage',
                taskId: hasTask ? outage.getValue('task_number') || '' : '',
                number: hasTask ? outage.task_number.getDisplayValue() : '',
                title: title,
                // Types other than degradation (outage, or any custom unplanned type) count as a full outage
                status:
                    this.OUTAGE_TYPE_STATUS[outage.getValue('type')] === 'degraded'
                        ? 'degraded'
                        : 'outage',
                priority: '',
                priorityLabel: '',
                state: '',
                affects:
                    this._describeAffected(
                        this._getAffectedOfferings(outage, impact),
                        impact
                    ) || ciName,
                message: message,
                // Not repeated when the message is already the title
                detail: message !== title ? message : '',
                group: '',
                since: new GlideDateTime(outage.getValue('begin')),
                sinceMessage: 'Since {0}'
            });
        }
        return outages;
    },

    // One Incidents and Outages list item; since is a GlideDateTime
    _incidentOutageItem: function (item) {
        var labels = {};
        this.getOfferingStatuses().forEach(function (status) {
            labels[status.id] = status.label;
        });
        return {
            id: item.id,
            // The record the title links to
            table: item.table,
            number: item.number || '',
            title: item.title,
            status: item.status || '',
            statusLabel: labels[item.status] || '',
            priority: item.priorityLabel || '',
            // P1 and P2 incidents are badged as major incidents: 'p1', 'p2' or ''
            major:
                item.table === 'incident' &&
                item.priority &&
                this.HIGH_PRIORITIES.split(',').indexOf(String(item.priority)) !== -1
                    ? 'p' + item.priority
                    : '',
            state: item.state || '',
            affects: item.affects || '',
            detail: String(item.detail || '')
                .replace(/\s+/g, ' ')
                .trim(),
            group: item.group || '',
            // In-progress resolution SLA, set on incidents by _applyResolutionSlas
            sla: null,
            // ISO 8601 UTC value for a machine-readable <time> element
            since: item.since.getValue().replace(' ', 'T') + 'Z',
            sinceLabel: gs.getMessage(item.sinceMessage, [
                this._formatSince(item.since)
            ]),
            // Sort keys, removed before the list is returned
            _priority: parseInt(item.priority, 10) || 99,
            _since: item.since.getNumericValue()
        };
    },

    _applyOutages: function (offeringsById, impact) {
        var now = new GlideDateTime().getValue();
        var outage = new GlideRecord('cmdb_ci_outage');
        outage.addQuery('cmdb_ci', 'IN', Object.keys(impact.byCi).join(','));
        outage.addQuery('begin', '<=', now);
        outage.addEncodedQuery('endISEMPTY^ORend>' + now);
        outage.orderByDesc('begin');
        outage.query();
        var hasTask = outage.isValidField('task_number');
        while (outage.next()) {
            var status = this.OUTAGE_TYPE_STATUS[outage.getValue('type')];
            if (!status) continue;
            this._applyToAffected(
                offeringsById,
                impact,
                outage,
                status,
                this._joinDetail([
                    outage.getValue('message') ||
                        outage.getDisplayValue('type'),
                    hasTask ? outage.task_number.getDisplayValue() : ''
                ])
            );
        }
    },

    // Changes in progress now, or starting within the next maintenanceDays days
    _applyMaintenance: function (offeringsById, impact, maintenanceDays) {
        var now = new GlideDateTime();
        var horizon = new GlideDateTime();
        horizon.addDaysUTC(maintenanceDays);

        var impactIds = Object.keys(impact.byCi);
        var related = this._getRelatedChangeCIs(
            [],
            impactIds,
            this.UPCOMING_CHANGE_STATES
        );
        var query = this._offeringQuery('change_request', impactIds);
        var relatedIds = Object.keys(related);
        if (relatedIds.length) query += '^ORsys_idIN' + relatedIds.join(',');

        var change = new GlideRecord('change_request');
        change.addEncodedQuery(query);
        change.addQuery('state', 'IN', this.UPCOMING_CHANGE_STATES);
        change.addQuery('start_date', '<=', horizon.getValue());
        change.addQuery('end_date', '>', now.getValue());
        change.orderBy('start_date');
        change.query();
        while (change.next()) {
            var start = new GlideDateTime(change.getValue('start_date'));
            var end = new GlideDateTime(change.getValue('end_date'));
            var inProgress = start.compareTo(now) <= 0;
            var when = inProgress
                ? gs.getMessage('until {0}', [this._formatShortDateTime(end)])
                : this._formatWindow(start, end);
            var summary =
                change.getValue('short_description') ||
                change.getValue('number');
            this._applyToAffected(
                offeringsById,
                impact,
                change,
                'maintenance',
                gs.getMessage('{0} {1}', [summary, when]),
                related[change.getUniqueValue()],
                {
                    summary: summary,
                    // Shown on its own line, so it starts with a capital
                    when: inProgress
                        ? gs.getMessage('Until {0}', [
                              this._formatShortDateTime(end)
                          ])
                        : when
                }
            );
        }
    },

    _applyIncidents: function (offeringsById, impact) {
        var incident = new GlideRecord('incident');
        incident.addEncodedQuery(
            this._offeringQuery('incident', Object.keys(impact.byCi))
        );
        incident.addActiveQuery();
        incident.addQuery('state', 'NOT IN', this.INACTIVE_INCIDENT_STATES);
        incident.orderBy('priority');
        incident.orderByDesc('sys_updated_on');
        incident.query();
        while (incident.next()) {
            this._applyToAffected(
                offeringsById,
                impact,
                incident,
                'monitoring',
                this._joinDetail([
                    incident.getValue('short_description'),
                    incident.getValue('number')
                ])
            );
        }
    },

    // Known problems leave the offering operational but explain the workaround
    _applyKnownProblems: function (offeringsById, impact) {
        var problem = new GlideRecord('problem');
        problem.addEncodedQuery(
            this._offeringQuery('problem', Object.keys(impact.byCi))
        );
        problem.addActiveQuery();
        problem.orderBy('priority');
        problem.query();
        while (problem.next()) {
            this._applyToAffected(
                offeringsById,
                impact,
                problem,
                'operational',
                gs.getMessage('{0} · see {1}', [
                    problem.getValue('short_description'),
                    problem.getValue('number')
                ])
            );
        }
    },

    // Sets the status on every site offering the record affects, naming the CI it was reached through.
    // parts ({summary, when}) is only needed when the summary differs from detail.
    _applyToAffected: function (
        offeringsById,
        impact,
        record,
        status,
        detail,
        relatedCis,
        parts
    ) {
        parts = parts || {};
        this._getAffectedOfferings(record, impact, relatedCis).forEach(
            function (affected) {
                this._setOfferingStatus(
                    offeringsById[affected.id],
                    status,
                    affected.via
                        ? this._joinDetail([
                              detail,
                              gs.getMessage('via {0}', [affected.via])
                          ])
                        : detail,
                    {
                        summary: parts.summary || detail,
                        when: parts.when || '',
                        via: affected.via
                            ? gs.getMessage('Via {0}', [affected.via])
                            : ''
                    }
                );
            },
            this
        );
    },

    // A more severe status always wins; at equal severity the first record (by query order) wins
    _setOfferingStatus: function (item, status, detail, parts) {
        if (!item) return;
        var rank = this.OFFERING_STATUS_RANK;
        if (
            rank[status] < rank[item.status] ||
            (rank[status] === rank[item.status] && item.explained)
        )
            return;
        parts = parts || {};
        item.status = status;
        item.detail = detail;
        item.summary = parts.summary || detail;
        item.when = parts.when || '';
        item.via = parts.via || '';
        item.explained = true;
    },

    // Offerings located at one of the locations or subscribed to by one (service_subscribe_location)
    _siteOfferingQuery: function (locationIds) {
        var query = 'locationIN' + locationIds.join(',');
        var subscription = new GlideRecord('service_subscribe_location');
        if (!subscription.isValid()) return query;
        subscription.addQuery('cmn_location', 'IN', locationIds.join(','));
        subscription.query();
        var subscribed = [];
        while (subscription.next())
            subscribed.push(subscription.getValue('service_offering'));
        if (subscribed.length) query += '^ORsys_idIN' + subscribed.join(',');
        return query;
    },

    // Offerings at the site that are not retired, as {sys_id: name}
    _getSiteOfferings: function (locationIds) {
        var offerings = {};
        var offering = new GlideRecord('service_offering');
        offering.addEncodedQuery(this._siteOfferingQuery(locationIds));
        offering.addQuery('install_status', '!=', this.RETIRED_INSTALL_STATUS);
        offering.query();
        while (offering.next())
            offerings[offering.getUniqueValue()] =
                offering.getDisplayValue('name');
        return offerings;
    },

    /**
     * Follows Depends on relationships down from the given offerings, so a record logged against an
     * application service, a technology offering or an infrastructure CI can be traced back to the
     * offerings it affects.
     * @param {Object<string, string>} offerings - offering names by sys_id
     * @returns {{byCi: Object<string, string[]>, names: Object<string, string>}} for every CI reached
     *     (including the offerings themselves), the offerings that depend on it
     */
    _getImpact: function (offerings) {
        var impact = { byCi: {}, names: offerings };
        var frontier = {};
        Object.keys(offerings).forEach(function (id) {
            impact.byCi[id] = [id];
            frontier[id] = [id];
        });
        for (
            var depth = 0;
            depth < this.IMPACT_DEPTH && Object.keys(frontier).length;
            depth++
        ) {
            var next = {};
            var rel = new GlideRecord('cmdb_rel_ci');
            rel.addQuery('parent', 'IN', Object.keys(frontier).join(','));
            rel.addQuery('type', this.DEPENDS_ON_REL_TYPE);
            rel.query();
            while (rel.next()) {
                var child = rel.getValue('child');
                var known = (impact.byCi[child] = impact.byCi[child] || []);
                frontier[rel.getValue('parent')].forEach(function (offeringId) {
                    if (known.indexOf(offeringId) !== -1) return;
                    known.push(offeringId);
                    (next[child] = next[child] || []).push(offeringId);
                });
            }
            frontier = next;
        }
        return impact;
    },

    // Site offerings a record affects through the CIs it names (plus any related CIs), each with the
    // CI it was reached through; empty via when the record names the offering itself
    _getAffectedOfferings: function (record, impact, relatedCis) {
        var cis = [];
        ['service_offering', 'business_service', 'cmdb_ci'].forEach(
            function (field) {
                if (record.isValidField(field) && record.getValue(field))
                    cis.push({
                        id: record.getValue(field),
                        name: record.getDisplayValue(field)
                    });
            }
        );
        cis = cis.concat(relatedCis || []);
        // Direct matches first, so an offering named on the record is not reported as reached via another
        // CI; filtered rather than sorted because Array.sort is not guaranteed stable on the server
        var isOffering = function (ci) {
            return !!impact.names[ci.id];
        };
        cis = cis.filter(isOffering).concat(
            cis.filter(function (ci) {
                return !isOffering(ci);
            })
        );

        var affected = [];
        var seen = {};
        cis.forEach(function (ci) {
            (impact.byCi[ci.id] || []).forEach(function (offeringId) {
                if (seen[offeringId]) return;
                seen[offeringId] = true;
                affected.push({
                    id: offeringId,
                    via: ci.id === offeringId ? '' : ci.name
                });
            });
        });
        return affected;
    },

    // e.g. "Fulfillment Operations, Inventory Operations (via Wi-Fi)"
    _describeAffected: function (affected, impact) {
        if (!affected.length) return '';
        var names = [];
        var vias = [];
        affected.forEach(function (item) {
            names.push(impact.names[item.id]);
            if (item.via && vias.indexOf(item.via) === -1) vias.push(item.via);
        });
        names.sort();
        return vias.length
            ? gs.getMessage('{0} (via {1})', [
                  names.join(', '),
                  vias.join(', ')
              ])
            : names.join(', ');
    },

    // Tasks link to an offering or another CI through cmdb_ci, and through service_offering and
    // business_service where the table has them. Checked first because an encoded query on an unknown
    // field is silently dropped.
    _offeringQuery: function (table, ids) {
        var list = ids.join(',');
        var query = 'cmdb_ciIN' + list;
        var record = new GlideRecord(table);
        ['service_offering', 'business_service'].forEach(function (field) {
            if (record.isValidField(field))
                query += '^OR' + field + 'IN' + list;
        });
        return query;
    },

    _joinDetail: function (parts) {
        return parts
            .filter(function (part) {
                return !!part;
            })
            .join(' · ');
    },

    // Matches tasks logged against the location or against a CI at the location
    _locationQuery: function (locationIds) {
        var ids = locationIds.join(',');
        return 'locationIN' + ids + '^ORcmdb_ci.locationIN' + ids;
    },

    // Matches tasks at the site (_locationQuery) or logged against a CI a site offering depends on
    _siteTaskQuery: function (table, locationIds, impactIds) {
        var query = this._locationQuery(locationIds);
        if (impactIds.length)
            query += '^OR' + this._offeringQuery(table, impactIds);
        return query;
    },

    // Matches records whose cmdb_ci is at the location or is a CI a site offering depends on
    _ciQuery: function (locationIds, impactIds) {
        var query = 'cmdb_ci.locationIN' + locationIds.join(',');
        if (impactIds.length) query += '^ORcmdb_ciIN' + impactIds.join(',');
        return query;
    },

    // Active CIs at the site, shared by the Monitored Assets card and widget
    _monitoredQuery: function (locationIds, ciFilter) {
        var query =
            'locationIN' +
            locationIds.join(',') +
            '^install_status!=' +
            this.RETIRED_INSTALL_STATUS;
        if (ciFilter) query += '^' + ciFilter;
        return query;
    },

    // The CI table comes from a widget option, so a mistyped name falls back to cmdb_ci
    _monitoredTable: function (ciTable) {
        return ciTable && new GlideRecord(ciTable).isValid()
            ? ciTable
            : 'cmdb_ci';
    },

    _count: function (table, encodedQuery) {
        var agg = new GlideAggregate(table);
        agg.addEncodedQuery(encodedQuery);
        agg.addAggregate('COUNT');
        agg.query();
        return agg.next() ? parseInt(agg.getAggregate('COUNT'), 10) : 0;
    },

    // e.g. "Sat 10 PM" or "Sat 10:30 PM" in the session user's time zone
    _formatShortDateTime: function (gdt) {
        return this._formatDay(gdt) + ' ' + this._formatTime(gdt, true);
    },

    // e.g. "Tue 6–7 AM", "Tue 11 AM – 1 PM" or "Sat 10 PM – Sun 2 AM"
    _formatWindow: function (start, end) {
        if (start.getLocalDate().getValue() !== end.getLocalDate().getValue())
            return (
                this._formatShortDateTime(start) +
                ' – ' +
                this._formatShortDateTime(end)
            );
        var sameMeridiem =
            start.getLocalTime().getByFormat('a') ===
            end.getLocalTime().getByFormat('a');
        return (
            this._formatDay(start) +
            ' ' +
            (sameMeridiem
                ? this._formatTime(start, false) +
                  '–' +
                  this._formatTime(end, true)
                : this._formatTime(start, true) +
                  ' – ' +
                  this._formatTime(end, true))
        );
    },

    // e.g. "6:00 – 8:00 AM ET", "10:00 PM – 2:00 AM ET", or "10:00 PM – Mon 6:00 AM ET" for windows of a day or more
    _formatTimeRange: function (start, end, zone) {
        var startTime = start.getLocalTime();
        var endTime = end.getLocalTime();
        var multiDay =
            end.getNumericValue() - start.getNumericValue() >=
            24 * 60 * 60 * 1000;
        var sameDate =
            start.getLocalDate().getValue() === end.getLocalDate().getValue();
        var sameMeridiem =
            sameDate && startTime.getByFormat('a') === endTime.getByFormat('a');
        var range =
            (sameMeridiem
                ? startTime.getByFormat('h:mm')
                : startTime.getByFormat('h:mm a')) +
            ' – ' +
            (multiDay ? this._formatDay(end) + ' ' : '') +
            endTime.getByFormat('h:mm a');
        return zone ? range + ' ' + zone : range;
    },

    // e.g. "today at 7:42 AM", "Mon 4:20 PM" within the last week, otherwise "Oct 2, 4:20 PM"
    _formatSince: function (gdt) {
        var now = new GlideDateTime();
        if (gdt.getLocalDate().getValue() === now.getLocalDate().getValue())
            return gs.getMessage('today at {0}', [this._formatTime(gdt, true)]);
        var weekAgo = new GlideDateTime();
        weekAgo.addDaysLocalTime(-6);
        if (gdt.compareTo(weekAgo) > 0) return this._formatShortDateTime(gdt);
        return (
            gdt.getLocalDate().getByFormat('MMM d') +
            ', ' +
            this._formatTime(gdt, true)
        );
    },

    // Generic zone name of the session user, e.g. "ET"; empty for zones without a known label
    _getTimeZoneLabel: function () {
        return (
            this.TIME_ZONE_LABELS[String(gs.getSession().getTimeZoneName())] ||
            ''
        );
    },

    _formatDay: function (gdt) {
        return gdt.getLocalDate().getByFormat('EEE');
    },

    _formatTime: function (gdt, withMeridiem) {
        var time = gdt.getLocalTime();
        var timeFormat = time.getByFormat('mm') === '00' ? 'h' : 'h:mm';
        return time.getByFormat(withMeridiem ? timeFormat + ' a' : timeFormat);
    },

    // table and query describe the records counted, so the card can link to their list
    _card: function (id, label, value, detail, table, query) {
        return {
            id: id,
            label: label,
            value: value,
            detail: detail,
            table: table,
            query: query
        };
    },

    type: 'SiteStatusUtility'
};
