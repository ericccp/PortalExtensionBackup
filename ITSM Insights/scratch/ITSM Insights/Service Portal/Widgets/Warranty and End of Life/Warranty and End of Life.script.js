(function () {
    // ---- Options & config ----
    var expiringDays = parseInt(options.expiring_days, 10) || 90;
    var refreshMonths = parseInt(options.refresh_months, 10) || 12;

    // Display text lives here so titles and messages can be updated in one place
    data.text = {
        title: options.heading
            ? gs.getMessage(options.heading)
            : gs.getMessage('Warranty and End of Life'),
        subtitle: options.subtitle
            ? gs.getMessage(options.subtitle)
            : gs.getMessage(
                  'Overview of asset warranty coverage and lifecycle status.'
              ),
        assetListLabel: gs.getMessage('View all'),
        warrantyHeading: gs.getMessage('Warranty Coverage'),
        lifecycleHeading: gs.getMessage('Lifecycle Status'),
        totalAssetsLabel: gs.getMessage('Total assets'),
        totalDistinctAssetsLabel: gs.getMessage('Total distinct assets'),
        covered: gs.getMessage('Covered'),
        expiringSoon: gs.getMessage('Expiring soon'),
        expired: gs.getMessage('Expired'),
        unknown: gs.getMessage('Unknown'),
        supported: gs.getMessage('Supported'),
        refreshSoon: gs.getMessage('Refresh soon'),
        pastEol: gs.getMessage('Past EOL'),
        coveredHint: gs.getMessage('More than {0} days remaining', [
            String(expiringDays)
        ]),
        expiringSoonHint: gs.getMessage('Expires within {0} days', [
            String(expiringDays)
        ]),
        expiredHint: gs.getMessage('Warranty has expired'),
        unknownHint: gs.getMessage('No expiration date'),
        supportedHint: gs.getMessage('General availability'),
        refreshSoonHint: gs.getMessage(
            'End of support or life within {0} months',
            [String(refreshMonths)]
        ),
        pastEolHint: gs.getMessage('End-of-life date has passed'),
        noWarrantyAssets: gs.getMessage('No hardware assets at this location.'),
        noLifecycleAssets: gs.getMessage(
            'No lifecycle data for hardware assets at this location.'
        ),
        noLocationMessage: gs.getMessage(
            'Select a location above to see warranty and lifecycle status.'
        ),
        loadingMessage: gs.getMessage('Loading warranty and lifecycle data...'),
        loadError: gs.getMessage(
            'This widget could not load asset data. Please try again later.'
        )
    };

    var ASSET_TABLE = 'alm_hardware';
    var LIFECYCLE_VIEW = 'u_asset_lifecycle_view';
    var PHASE_GA = 'availability';
    var PHASE_EOS = 'end_of_support';
    var PHASE_EOL = 'end_of_life';

    // Base link has no location filter yet; a location is appended once one is selected
    var assetListBase = '/' + ASSET_TABLE + '_list.do';

    // Lifecycle buckets link by sys_id; above this many ids the URL gets too long to be
    // reliable, so the count is shown without a link
    var MAX_LINKED_IDS = 500;

    function assetListUrl(encodedQuery) {
        return (
            assetListBase + '?sysparm_query=' + encodeURIComponent(encodedQuery)
        );
    }

    data.loadError = false;
    data.noLocation = true;
    data.assetListUrl = options.asset_list_url || assetListBase;
    data.sections = [];

    // Site Status Header broadcasts a comma-separated list of cmn_location sys_ids
    function sanitizeLocationIds(raw) {
        return String(raw || '')
            .split(',')
            .map(function (s) {
                return s.trim();
            })
            .filter(function (s) {
                return /^[0-9a-f]{32}$/i.test(s);
            });
    }

    // Largest-remainder rounding so the displayed percentages always add up to 100.
    // queries maps a segment key to the alm_hardware encoded query behind its count.
    function buildSegments(defs, counts, total, queries) {
        var segments = [];
        var allocated = 0;
        var i;
        for (i = 0; i < defs.length; i++) {
            var count = counts[defs[i].key] || 0;
            var exact = total ? (count / total) * 100 : 0;
            var pct = Math.floor(exact);
            allocated += pct;
            segments.push({
                key: defs[i].key,
                label: defs[i].label,
                hint: defs[i].hint,
                count: count,
                percent: pct,
                remainder: exact - pct
            });
        }
        if (total) {
            var order = segments.slice().sort(function (a, b) {
                return b.remainder - a.remainder;
            });
            for (i = 0; i < order.length && allocated < 100; i++) {
                if (order[i].count > 0) {
                    order[i].percent++;
                    allocated++;
                }
            }
        }
        for (i = 0; i < segments.length; i++) {
            segments[i].ariaLabel =
                segments[i].label +
                ': ' +
                gs.getMessage('{0} assets, {1}%', [
                    String(segments[i].count),
                    String(segments[i].percent)
                ]);
            var query = queries[segments[i].key];
            segments[i].url =
                segments[i].count && query ? assetListUrl(query) : '';
            segments[i].linkLabel = gs.getMessage(
                'View list of {0} assets: {1}',
                [String(segments[i].count), segments[i].label]
            );
            delete segments[i].remainder;
        }
        return segments;
    }

    function dateOffset(days, months) {
        var gdt = new GlideDateTime();
        if (days) {
            gdt.addDaysLocalTime(days);
        }
        if (months) {
            gdt.addMonthsLocalTime(months);
        }
        return gdt.getLocalDate().getValue(); // yyyy-MM-dd
    }

    // ---- Warranty coverage (alm_hardware) ----
    // Each bucket is a disjoint date range, so statuses are mutually exclusive.
    // The same encoded query drives both the count and the segment's list link.
    function loadWarranty(locationList, today, expiringCutoff) {
        var scope = 'locationIN' + locationList + '^';
        var queries = {
            unknown: scope + 'warranty_expirationISEMPTY',
            expired:
                scope +
                'warranty_expirationISNOTEMPTY^warranty_expiration<' +
                today,
            expiringSoon:
                scope +
                'warranty_expiration>=' +
                today +
                '^warranty_expiration<=' +
                expiringCutoff,
            covered: scope + 'warranty_expiration>' + expiringCutoff
        };

        function countWhere(encodedQuery) {
            var ga = new GlideAggregate(ASSET_TABLE);
            ga.addEncodedQuery(encodedQuery);
            ga.addAggregate('COUNT');
            ga.query();
            return ga.next() ? parseInt(ga.getAggregate('COUNT'), 10) || 0 : 0;
        }

        var counts = {
            unknown: countWhere(queries.unknown),
            expired: countWhere(queries.expired),
            expiringSoon: countWhere(queries.expiringSoon),
            covered: countWhere(queries.covered)
        };
        var total =
            counts.covered +
            counts.expiringSoon +
            counts.expired +
            counts.unknown;

        return {
            total: total,
            segments: buildSegments(
                [
                    {
                        key: 'covered',
                        label: data.text.covered,
                        hint: data.text.coveredHint
                    },
                    {
                        key: 'expiringSoon',
                        label: data.text.expiringSoon,
                        hint: data.text.expiringSoonHint
                    },
                    {
                        key: 'expired',
                        label: data.text.expired,
                        hint: data.text.expiredHint
                    },
                    {
                        key: 'unknown',
                        label: data.text.unknown,
                        hint: data.text.unknownHint
                    }
                ],
                counts,
                total,
                queries
            )
        };
    }

    // ---- Lifecycle status (u_asset_lifecycle_view) ----
    // The view joins alm_hardware -> hardware product model -> model lifecycle, so an
    // asset appears once per lifecycle phase; rows are collapsed per asset before classifying.
    function loadLifecycle(locationList, today, refreshCutoff) {
        var assets = {};
        var gr = new GlideRecordSecure(LIFECYCLE_VIEW);
        gr.addQuery('asset_location', 'IN', locationList);
        gr.addNotNullQuery('lifecycle_sys_id');
        gr.query();
        while (gr.next()) {
            var assetId = gr.getValue('asset_sys_id');
            if (!assetId) {
                continue;
            }
            var asset = assets[assetId];
            if (!asset) {
                asset = assets[assetId] = {
                    currentGa: false,
                    gaEnd: '',
                    eosStart: '',
                    eosEnd: '',
                    eolStart: ''
                };
            }
            var phase = gr.getValue('lifecycle_lifecycle_phase');
            var start = gr.getValue('lifecycle_start_date') || '';
            var end = gr.getValue('lifecycle_end_date') || '';
            var isCurrent =
                gr.getValue('lifecycle_current_lifecycle_phase') === '1' ||
                gr.getValue('lifecycle_current_lifecycle_phase') === 'true';

            // Keep the earliest milestone if a model has duplicate phase records
            if (phase === PHASE_GA) {
                asset.currentGa = asset.currentGa || isCurrent;
                asset.gaEnd = earliest(asset.gaEnd, end);
            } else if (phase === PHASE_EOS) {
                asset.eosStart = earliest(asset.eosStart, start);
                asset.eosEnd = earliest(asset.eosEnd, end);
            } else if (phase === PHASE_EOL) {
                asset.eolStart = earliest(asset.eolStart, start);
            }
        }

        // Buckets are computed per asset, so they can't be expressed as a filter; the
        // list links point at the classified asset sys_ids instead
        var ids = { supported: [], refreshSoon: [], pastEol: [] };
        var total = 0;
        var id;
        for (id in assets) {
            if (assets.hasOwnProperty(id)) {
                ids[classifyLifecycle(assets[id], today, refreshCutoff)].push(
                    id
                );
                total++;
            }
        }

        var counts = {};
        var queries = {};
        var key;
        for (key in ids) {
            if (ids.hasOwnProperty(key)) {
                counts[key] = ids[key].length;
                if (ids[key].length <= MAX_LINKED_IDS) {
                    queries[key] = 'sys_idIN' + ids[key].join(',');
                }
            }
        }

        return {
            total: total,
            segments: buildSegments(
                [
                    {
                        key: 'supported',
                        label: data.text.supported,
                        hint: data.text.supportedHint
                    },
                    {
                        key: 'refreshSoon',
                        label: data.text.refreshSoon,
                        hint: data.text.refreshSoonHint
                    },
                    {
                        key: 'pastEol',
                        label: data.text.pastEol,
                        hint: data.text.pastEolHint
                    }
                ],
                counts,
                total,
                queries
            )
        };
    }

    function earliest(current, candidate) {
        if (!candidate) {
            return current;
        }
        return !current || candidate < current ? candidate : current;
    }

    // End of life is evaluated before end of support. A phase's start date is its
    // milestone; the previous phase's end date is the fallback when it is missing.
    function classifyLifecycle(asset, today, refreshCutoff) {
        var eolDate = asset.eolStart || asset.eosEnd;
        var eosDate = asset.eosStart || asset.gaEnd;

        if (eolDate && eolDate < today) {
            return 'pastEol';
        }
        if (eolDate && eolDate <= refreshCutoff) {
            return 'refreshSoon';
        }
        // Already out of support, or support ends inside the refresh window
        if (eosDate && eosDate <= refreshCutoff) {
            return 'refreshSoon';
        }
        return 'supported';
    }

    // ---- Client round-trip: load data once Site Status Header reports a location ----
    if (input && input.action === 'getData') {
        var locationIds = sanitizeLocationIds(input.locationId);
        data.noLocation = locationIds.length === 0;
        if (!data.noLocation) {
            var locationList = locationIds.join(',');
            data.assetListUrl =
                options.asset_list_url ||
                assetListUrl('locationIN' + locationList);
            try {
                var today = dateOffset(0, 0);
                var warranty = loadWarranty(
                    locationList,
                    today,
                    dateOffset(expiringDays, 0)
                );
                var lifecycle = loadLifecycle(
                    locationList,
                    today,
                    dateOffset(0, refreshMonths)
                );
                data.sections = [
                    {
                        id: 'warranty',
                        heading: data.text.warrantyHeading,
                        totalLabel: data.text.totalAssetsLabel,
                        emptyMessage: data.text.noWarrantyAssets,
                        total: warranty.total,
                        segments: warranty.segments
                    },
                    {
                        id: 'lifecycle',
                        heading: data.text.lifecycleHeading,
                        totalLabel: data.text.totalDistinctAssetsLabel,
                        emptyMessage: data.text.noLifecycleAssets,
                        total: lifecycle.total,
                        segments: lifecycle.segments
                    }
                ];
            } catch (e) {
                gs.error('Warranty and End of Life widget: ' + e);
                data.loadError = true;
                data.sections = [];
            }
        }
    }
})();
