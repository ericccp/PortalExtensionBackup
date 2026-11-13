var AssetWidgetUtilsExtension = Class.create();

AssetWidgetUtilsExtension.prototype = {
    initialize: function() {
        this.sessionLanguage = gs.getSession().getLanguage();
        this.DEFAULT_LIMIT = AssetWidgetUtilsExtension.DEFAULT_LIMIT;

        // Field on the licensed_by record that flags whether a software license
        // may be unsubscribed from the portal. Kept here for easy visibility/changes.
        // this.ALLOW_UNSUBSCRIBE_FIELD = "x_rys_itsm_allow_unsubscribe";
        this.ALLOW_UNSUBSCRIBE_FIELD = "u_allow_unsubscribe";
    },

    isManager: function() {
        var currentUserID = gs.getUserID();
        var gr = new GlideRecord("sys_user");
        gr.addQuery("manager", currentUserID);
        // Being listed as the "manager" of a machine/service account doesn't make
        // someone a people manager, so those accounts don't count.
        gr.addQuery("u_adm_account", "false");
        gr.addQuery("internal_integration_user", "false");
        gr.addQuery("web_service_access_only", "false");
        gr.limit(1);
        gr.query();
        return gr.hasNext();
    },

    isCostCenterManager: function() {
        var currentUserID = gs.getUserID();
        var gr = new GlideRecord("cmn_cost_center");
        gr.addQuery("manager", currentUserID);
        gr.limit(1);
        gr.query();
        return gr.hasNext();
    },

    /**
     * Whether the skip-level toggle should be exposed to the current user, i.e.
     * they're a manager and the configured manager-hierarchy depth goes beyond
     * direct reports. Drives the "asset-hub-toggle-skip-levels" widget's
     * hasSkipLevels option in EC Asset Filters.
     *
     * @returns {Boolean}
     */
    hasSkipLevels: function() {
        return this.isManager() && this._getManagerHierarchyDepth() > 1;
    },

    /**
     * Applies the shared hardware-asset scope that powers the Devices tab:
     * audience, device model categories (Computer / Personal Computer / Handheld Computing Device),
     * and employee-facing lifecycle status. Every hardware surface (Devices list,
     * filter options, My team counts) must go through this so the results match.
     *
     * @param {GlideRecord} gr - An alm_hardware GlideRecord(Secure) to constrain.
     * @param {String} [statusFilter] - Optional status filter key.
     * @param {Boolean} [includeSkipLevels] - When true and the current user is a
     *     manager, expands the audience to the full configured manager-hierarchy
     *     depth (skip-level toggle). When false/omitted, only direct reports are
     *     included.
     */
    applyHardwareAssetScope: function(gr, statusFilter, includeSkipLevels) {
        gr.addEncodedQuery(this._getAudienceEncodedQuery(includeSkipLevels));

        // Model category is Computer, Personal Computer, or Handheld Computing Device.
        gr.addEncodedQuery(
            "model_category=81feb9c137101000deeabfc8bcbe5dc4" +
            "^ORmodel_category=0be11f58c7432010f74c784c95c260b7" +
            "^ORmodel_category=4bb5a60fdbf6ca908bdd8168139619eb"
        );

        // Apply install_status query based on optional statusFilter value.
        gr.addEncodedQuery(this._getHardwareInstallStatusQuery(statusFilter));
    },

    /**
     * Returns paginated hardware assets for the current user/audience.
     *
     * @param {Number|String} limit - Number of records to render.
     * @param {Number|String} offset - Number of records to skip.
     * @param {String} searchText - Optional full-text search value.
     * @param {Object} uiFilters - Optional UI filters.
     * @param {String} statusFilter - Optional status filter key.
     * @param {Object|String} sortOption - Optional sort option.
     * @param {Boolean} [includeSkipLevels] - Skip-level toggle state; see applyHardwareAssetScope.
     * @returns {Object} Object containing data, showMore, offset, and nextOffset.
     */
    getHardwareAssets: function(limit, offset, searchText, uiFilters, statusFilter, sortOption, includeSkipLevels) {
        var paging = this._getPaging(limit, offset);

        var result = {
            data: [],
            showMore: false,
            offset: paging.offset,
            nextOffset: paging.offset
        };

        var gr = new GlideRecordSecure("alm_hardware");
        this.applyHardwareAssetScope(gr, statusFilter, includeSkipLevels);

        if (searchText) {
            gr.addQuery("123TEXTQUERY321", searchText);
        }

        this._applyAssetUiFilters(gr, uiFilters);

        this._applyAssetSort(gr, sortOption, false);

        // Fetch one extra row so we can determine whether to show "Show more".
        gr.chooseWindow(paging.windowStart, paging.windowEnd);
        gr.query();

        var addedItems = 0;

        while (gr.next()) {
            if (addedItems === paging.limit) {
                result.showMore = true;
                break;
            }

            result.data.push(this._buildHardwareAssetPayload(gr));
            addedItems++;
        }

        if (result.showMore) {
            result.nextOffset = paging.offset + paging.limit;
        }

        return result;
    },

    _buildHardwareAssetPayload: function(gr) {
        var attest = "";
        var attesturl = "";

        // new global.GlideQuery(sn_itam_common.AssetAttestationUtils.ATTESTATION_ASSET_TABLE)
        //     .where('asset', String(gr.getValue('sys_id')))
        //     .where('status', sn_itam_common.AssetAttestationUtils.ASSET_M2M_STATUS.OPEN)
        //     .selectOne('sys_id')
        //     .ifPresent(function(record) {
        //         attest = AssetWidgetUtilsExtension.REFRESH_ASSET_LABEL;
        //         attesturl = AssetWidgetUtilsExtension.ATTESTATION_URL + record.sys_id;
        //     });

        var receive = "";

        if (
            gr.getValue("install_status") == AssetWidgetUtilsExtension.INTRANSIT_STATUS &&
            gr.getValue("substatus") == AssetWidgetUtilsExtension.RESERVED_SUBSTATUS
        ) {
            receive = AssetWidgetUtilsExtension.RECEIVE_BUTTON_LABEL;
        }

        return {
            sysID: gr.getUniqueValue(),
            sysClassName: gr.getDisplayValue("sys_class_name"),
            title: gr.getDisplayValue("serial_number") || gr.getDisplayValue("asset_tag"),
            serialNumber: gr.getDisplayValue("serial_number"),
            assetTag: gr.getDisplayValue("asset_tag"),
            model: gr.getDisplayValue("model.name"),
            model_category: gr.getDisplayValue("model_category"),
            install_status: gr.getDisplayValue("install_status"),
            subcaption: gr.getDisplayValue("assigned_to") || gr.getDisplayValue("reserved_for"),
            url: "?id=device_lookup&sys_id=" + gr.getUniqueValue(),
            asset_function: gr.getDisplayValue("asset_function"),
            assigned_to: gr.getDisplayValue("assigned_to"),
            assigned_to_sys_id: gr.getValue("assigned_to"),
            reserved_for: gr.getDisplayValue("reserved_for"),
            reserved_for_sys_id: gr.getValue("reserved_for"),
            cost_center: gr.getDisplayValue("cost_center"),
            location: gr.getDisplayValue("location"),
            type: gr.getDisplayValue("sys_class_name"),
            attest: attest,
            attesturl: attesturl,
            receive: receive,
            timestamp: gr.getValue("sys_updated_on")
        };
    },

    /**
     * @param {Boolean} [includeSkipLevels] - When true, walks the full configured
     *     manager-hierarchy depth; when false/omitted, direct reports only.
     */
    _getAudienceEncodedQuery: function(includeSkipLevels) {
        var encodedQuery =
            "assigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe" +
            "^ORreserved_forDYNAMIC90d1921e5f510100a9ad2572f2b477fe";

        if (this.isManager()) {
            var depth = includeSkipLevels ? this._getManagerHierarchyDepth() : 1;
            var reportIds = this._getAllReportSysIds(gs.getUserID(), depth);
            if (reportIds.length) {
                encodedQuery +=
                    "^ORassigned_toIN" + reportIds.join(",") +
                    "^ORreserved_forIN" + reportIds.join(",");
            }
        }

        // if (this.isCostCenterManager()) {
        //     encodedQuery +=
        //         "^ORcost_center.managerDYNAMIC90d1921e5f510100a9ad2572f2b477fe";
        // }

        return encodedQuery;
    },

    /**
     * Reads the configurable manager-hierarchy depth used by _getAudienceEncodedQuery,
     * clamped to a safe range regardless of what's configured on the property.
     *
     * @returns {Number} Number of manager levels to walk (>= 1).
     */
    _getManagerHierarchyDepth: function() {
        var MIN_DEPTH = 1;
        var MAX_DEPTH = 10;
        var configured = parseInt(gs.getProperty("x_1026751_portal_0.asset_my_it_assets.manager_hierarchy_depth", "1"), 10);

        if (isNaN(configured)) {
            return MIN_DEPTH;
        }

        return Math.min(Math.max(configured, MIN_DEPTH), MAX_DEPTH);
    },

    /**
     * Walks the sys_user.manager relationship down from managerSysId, breadth-first,
     * to collect the sys_ids of everyone in that manager's hierarchy up to maxDepth levels.
     *
     * @param {String} managerSysId - sys_id of the top-level manager.
     * @param {Number} maxDepth - Maximum number of manager levels to walk.
     * @returns {Array} Sys_ids of all reports found within maxDepth levels.
     */
    _getAllReportSysIds: function(managerSysId, maxDepth) {
        var ids = [];
        var frontier = [managerSysId];
        var seen = {};
        seen[managerSysId] = true;

        for (var depth = 0; depth < maxDepth && frontier.length; depth++) {
            var gr = new GlideRecord("sys_user");
            gr.addQuery("manager", "IN", frontier.join(","));
            gr.addQuery("u_adm_account", "false");
            gr.addQuery("internal_integration_user", "false");
            gr.addQuery("web_service_access_only", "false");
            gr.query();

            frontier = [];
            while (gr.next()) {
                var id = gr.getUniqueValue();
                if (!seen[id]) {
                    seen[id] = true;
                    ids.push(id);
                    frontier.push(id);
                }
            }
        }

        return ids;
    },

    _applyAssetUiFilters: function(gr, uiFilters) {
        if (!uiFilters) {
            return;
        }

        for (var fieldName in uiFilters) {
            if (!uiFilters.hasOwnProperty(fieldName)) {
                continue;
            }

            var filter = uiFilters[fieldName];
            var values = filter && filter.selectedOptions;

            if (!values || !values.length) {
                continue;
            }

            if (fieldName == "assigned_to") {
                var assignedToQuery = gr.addQuery("assigned_to", "IN", values.join(","));
                assignedToQuery.addOrCondition("reserved_for", "IN", values.join(","));
                continue;
            }

            if (fieldName == "install_status") {
                this._applyInstallStatusUiFilter(gr, values);
                continue;
            }

            gr.addQuery(fieldName, "IN", values.join(","));
        }
    },

    /**
     * Applies the Status dropdown's selected values, which may mix literal
     * install_status codes (e.g. "1") with synthetic My IT Assets Summary
     * panel ids (e.g. "loaner_devices"). Each panel id contributes its own
     * PANEL_DEFINITIONS query fragment; everything selected combines with OR.
     *
     * @param {GlideRecord} gr
     * @param {Array} values - Selected install_status filter values.
     */
    _applyInstallStatusUiFilter: function(gr, values) {
        var literalCodes = [];
        var panelQueries = [];

        for (var i = 0; i < values.length; i++) {
            var definition = this._getPanelDefinition(values[i]);
            if (definition && definition.appliesTo === "hardware" && definition.query) {
                panelQueries.push(definition.query);
            } else {
                literalCodes.push(values[i]);
            }
        }

        var queryGroups = [];
        if (literalCodes.length) {
            queryGroups.push("install_status=" + literalCodes.join("^ORinstall_status="));
        }
        queryGroups = queryGroups.concat(panelQueries);

        if (queryGroups.length) {
            gr.addEncodedQuery(queryGroups.join("^NQ"));
        }
    },

    /**
     * Returns paginated software assets for the current user and their direct reports.
     *
     * @param {Number|String} limit - Number of records to render.
     * @param {Number|String} offset - Number of records to skip.
     * @param {String} searchText - Optional full-text search value.
     * @param {Object|String} sortOption - Optional sort option.
     * @returns {Object} Object containing data, showMore, offset, and nextOffset.
     */
    getSoftwareAssets: function(limit, offset, searchText, sortOption, uiFilters) {
        var paging = this._getPaging(limit, offset);

        var result = {
            data: [],
            showMore: false,
            offset: paging.offset,
            nextOffset: paging.offset
        };

        var gr = new GlideRecordSecure("alm_entitlement");
        this._applySoftwareAudience(gr);

        this._applySoftwareKeywordSearch(gr, searchText);

        // Software assignments use assigned_to only; hardware also uses reserved_for.
        for (var fieldName in (uiFilters || {})) {
            if (!Object.prototype.hasOwnProperty.call(uiFilters, fieldName)) continue;
            var filter = uiFilters[fieldName];
            if (filter && filter.selectedOptions && filter.selectedOptions.length) {
                gr.addQuery(fieldName, "IN", filter.selectedOptions.join(","));
            }
        }
        this._applyAssetSort(gr, sortOption, true);

        // Fetch one extra row so we can determine whether to show "Show more".
        gr.chooseWindow(paging.windowStart, paging.windowEnd);
        gr.query();

        var addedItems = 0;

        while (gr.next()) {
            if (addedItems === paging.limit) {
                result.showMore = true;
                break;
            }

            result.data.push(this._buildSoftwareAssetPayload(gr));
            addedItems++;
        }

        if (result.showMore) {
            result.nextOffset = paging.offset + paging.limit;
        }

        return result;
    },

    _buildSoftwareAssetPayload: function(gr) {
        // Optional license fields vary by instance. Read only existing, accessible
        // fields and references; an absent renewal flag must not mean "manual".
        function field(record, name, raw) {
            if (!record || !record.isValidField(name)) return "";
            var element = record.getElement(name);
            if (!element || !element.canRead()) return "";
            return (raw ? record.getValue(name) : record.getDisplayValue(name)) || "";
        }

        function reference(record, name) {
            var id = field(record, name, true);
            if (!id) return null;
            var table = record.getElement(name).getReferenceTable();
            if (!table) return null;
            var target = new GlideRecordSecure(table);
            return target.get(id) && target.canRead() ? target : null;
        }

        var license = reference(gr, "licensed_by");
        var model = reference(license, "model");
        var device = reference(gr, "allocated_to");
        var owner = reference(gr, "assigned_to");
        var renewal = field(license, "auto_renew", true);
        var allowUnsubscribe = field(license, this.ALLOW_UNSUBSCRIBE_FIELD, true);
        var deviceName = field(device, "name") || field(device, "asset_tag") || field(gr, "allocated_to");

        return {
            unsubscribe_option: allowUnsubscribe === "1" || allowUnsubscribe === "true",
            sysID: gr.getUniqueValue(),
            sysClassName: gr.getDisplayValue("sys_class_name"),
            title: field(model, "name"),
            manufacturer: field(model, "manufacturer"),
            unit_cost: field(model, "cost"),
            model_category: "Software",
            install_status: "Subscription",
            subcaption: field(gr, "assigned_to"),
            assigned_to: field(gr, "assigned_to"),
            assigned_to_sys_id: field(gr, "assigned_to", true),
            cost_center: field(owner, "cost_center"),
            location: field(device, "location") || field(owner, "location"),
            software: {
                productType: field(license, "product_type"),
                isDeviceLicense: !!device,
                deviceName: deviceName,
                deviceModel: field(device, "model_id") || field(device, "model"),
                licenseId: field(license, "asset_tag") || field(license, "number"),
                image: field(model, "picture", true),
                status: field(license, "install_status"),
                subscriptionPeriod: field(license, "subscription_period"),
                expires: field(license, "end_date"),
                renewal: renewal === "1" || renewal === "true" ? "automatic" :
                    renewal === "0" || renewal === "false" ? "manual" : ""
            },
            type: "Software",
            url: "?id=software_lookup&sys_id=" + gr.getUniqueValue(),
            timestamp: gr.getValue("sys_updated_on")
        };
    },

    /**
     * Normalizes pagination values and prepares the GlideRecord chooseWindow range.
     *
     * chooseWindow(start, end) uses a window range, so end is offset + limit + 1.
     * The extra row is used only to decide whether "Show more" should be displayed.
     */
    _getPaging: function(limit, offset) {
        limit = parseInt(limit, 10);
        offset = parseInt(offset, 10);

        if (isNaN(limit) || limit <= 0) {
            limit = this.DEFAULT_LIMIT || AssetWidgetUtilsExtension.DEFAULT_LIMIT;
        }

        if (isNaN(offset) || offset < 0) {
            offset = 0;
        }

        return {
            limit: limit,
            offset: offset,
            windowStart: offset,
            windowEnd: offset + limit + 1
        };
    },

    _applyAssetSort: function(gr, sortOption, isSoftware) {
        var sortValue = "";

        if (sortOption) {
            if (typeof sortOption == "string") {
                sortValue = sortOption;
            } else {
                sortValue = sortOption.value || sortOption.id || "";
            }
        }

        if (sortValue == "assignedTo") {
            gr.orderBy("assigned_to");
            gr.orderBy("sys_id");
            return;
        }

        if (sortValue == "newest") {
            gr.orderByDesc("sys_created_on");
            gr.orderBy("sys_id");
            return;
        }

        if (sortValue == "oldest") {
            gr.orderBy("sys_created_on");
            gr.orderBy("sys_id");
            return;
        }

        if (isSoftware) {
            gr.orderBy("licensed_by.model.name");
            gr.orderBy("sys_id");
            return;
        }

        gr.orderBy("serial_number");
        gr.orderBy("sys_id");
    },

    getAssetFiltersForTab: function(tabType, searchText, statusFilter, includeSkipLevels) {
        tabType = (tabType || "").toString().toLowerCase().trim();

        if (tabType == "software") {
            return this._getSoftwareAssetFilters(searchText);
        }

        return this._getHardwareAssetFilters(searchText, statusFilter, includeSkipLevels);
    },

    _getHardwareAssetFilters: function(searchText, statusFilter, includeSkipLevels) {
        var gr = new GlideRecordSecure("alm_hardware");
        // Keep this query aligned to getHardwareAssets(), but do not apply pagination.
        this.applyHardwareAssetScope(gr, statusFilter, includeSkipLevels);

        if (searchText) {
            gr.addQuery("123TEXTQUERY321", searchText);
        }

        gr.query();

        // Literal install_status field values, plus one synthetic choice per
        // hardware panel definition (id doubles as the choice value), so the
        // Status dropdown surfaces the exact same options as My IT Assets Summary.
        var installStatusChoices = [
            { value: "1", label: gs.getMessage("In use") },
            { value: "9", label: gs.getMessage("In transit") },
            { value: "3", label: gs.getMessage("In repair") }
        ].concat(this._getHardwarePanelChoices());

        return this._buildAssetFilterResponse(gr, [{
                id: "assigned_to",
                label: gs.getMessage("Assigned to"),
                fields: ["assigned_to", "reserved_for"]
            },
            {
                id: "location",
                label: gs.getMessage("Location"),
                field: "location"
            },
            {
                id: "cost_center",
                label: gs.getMessage("Cost center"),
                field: "cost_center"
            },
            {
                id: "install_status",
                label: gs.getMessage("Status"),
                field: "install_status",
                // Only expose employee-facing lifecycle choices present in the results.
                choices: installStatusChoices
            },
            {
                id: "model_category",
                label: gs.getMessage("Device Type"),
                field: "model_category"
            }
        ], { install_status: statusFilter });
    },

    /**
     * Synthetic Status-dropdown choices, one per hardware My IT Assets Summary
     * panel definition that has a query (placeholder panels without queries are
     * excluded). Each choice's value is the panel id, and its presence in the
     * dropdown is decided by the panel's own matches(gr) predicate rather than
     * a literal field value.
     *
     * @returns {Array}
     */
    _getHardwarePanelChoices: function() {
        var definitions = new global.MyAssetsSummaryConfig().getPanelDefinitions();
        var choices = [];

        for (var i = 0; i < definitions.length; i++) {
            var definition = definitions[i];
            if (definition.appliesTo !== "hardware" || !definition.query) {
                continue;
            }
            choices.push({
                value: definition.id,
                label: gs.getMessage(definition.label),
                matches: definition.matches
            });
        }

        return choices;
    },

    _applySoftwareAudience: function(gr) {
        // Use the same audience for software results and filter options.
        // GlideRecordSecure continues to enforce access to each entitlement.
        var currentUserId = gs.getUserID();
        var audience = gr.addQuery("assigned_to", currentUserId);
        if (this.isManager()) {
            audience.addOrCondition("assigned_to.manager", currentUserId);
        }
        gr.addQuery("licensed_by.install_status", "1");
    },

    /**
     * Keyword search for the Software licenses tab.
     *
     * alm_entitlement has no useful text index of its own: every value shown on a
     * software card is dot-walked from related records (product name/manufacturer
     * from licensed_by.model, the assignee, the license identifiers). The magic
     * 123TEXTQUERY321 operator only searches the entitlement's own indexed fields,
     * so it never matches what the user actually sees. Query those fields directly
     * instead, mirroring how the Devices tab's text search behaves.
     *
     * @param {GlideRecord} gr - An alm_entitlement GlideRecord(Secure) to constrain.
     * @param {String} [searchText] - Optional keyword.
     */
    _applySoftwareKeywordSearch: function(gr, searchText) {
        searchText = String(searchText || "").trim();
        if (!searchText) {
            return;
        }

        var keyword = gr.addQuery("licensed_by.model.name", "CONTAINS", searchText);
        keyword.addOrCondition("licensed_by.model.manufacturer.name", "CONTAINS", searchText);
        keyword.addOrCondition("assigned_to.name", "CONTAINS", searchText);
        keyword.addOrCondition("allocated_to.name", "CONTAINS", searchText);
        keyword.addOrCondition("licensed_by.asset_tag", "CONTAINS", searchText);
        keyword.addOrCondition("licensed_by.number", "CONTAINS", searchText);
    },

    _getSoftwareAssetFilters: function(searchText) {
        var gr = new GlideRecordSecure("alm_entitlement");
        this._applySoftwareAudience(gr);

        this._applySoftwareKeywordSearch(gr, searchText);

        gr.query();

        return this._buildAssetFilterResponse(gr, [{
                id: "licensed_by.model",
                label: gs.getMessage("Product name"),
                field: "licensed_by.model"
            },
            {
                id: "licensed_by.subscription_period",
                label: gs.getMessage("Period"),
                field: "licensed_by.subscription_period",
                // Only surface period choices that appear in this user's current
                // results, so selecting one can never yield an empty list. choices
                // is still supplied to keep the dictionary order and translated
                // labels; _buildAssetFilterResponse trims it to values present.
                choices: this._getChoiceList("alm_license", "subscription_period")
            },
            {
                id: "assigned_to",
                label: gs.getMessage("Assigned to"),
                field: "assigned_to"
            },
            {
                id: "location",
                label: gs.getMessage("Location"),
                field: "location"
            },
            {
                // alm_entitlement has no cost_center of its own; the card shows
                // the assignee's cost center, so filter on the same dot-walk.
                id: "assigned_to.cost_center",
                label: gs.getMessage("Cost center"),
                field: "assigned_to.cost_center"
            }
        ]);
    },

    /**
     * Returns the active choices for a table/field as [{ value, label }],
     * ordered by the dictionary choice sequence, localized to the session
     * language (falling back to the base "en" choices when none are defined
     * for that language).
     *
     * @param {String} tableName - Table the choice list is defined on.
     * @param {String} fieldName - Choice field element name.
     * @returns {Array} Array of { value, label } objects.
     */
    _getChoiceList: function(tableName, fieldName) {
        var byLanguage = {};

        var gr = new GlideRecord("sys_choice");
        gr.addQuery("name", tableName);
        gr.addQuery("element", fieldName);
        gr.addQuery("inactive", false);
        gr.addQuery("language", "IN", (this.sessionLanguage || "en") + ",en");
        gr.orderBy("sequence");
        gr.orderBy("label");
        gr.query();

        while (gr.next()) {
            var language = gr.getValue("language");
            if (!byLanguage[language]) {
                byLanguage[language] = [];
            }
            byLanguage[language].push({
                value: gr.getValue("value"),
                label: gr.getValue("label")
            });
        }

        return byLanguage[this.sessionLanguage] || byLanguage.en || [];
    },

    _buildAssetFilterResponse: function(gr, filterDefinitions, selectedByCategory) {
        var canFilterAssignedTo = this.isManager() || this.isCostCenterManager();
        filterDefinitions = filterDefinitions.filter(function(definition) {
            return definition.id !== "assigned_to" || canFilterAssignedTo;
        });

        var filterCategories = [];
        var categoryLookup = {};

        for (var i = 0; i < filterDefinitions.length; i++) {
            var definition = filterDefinitions[i];

            categoryLookup[definition.id] = {
                selection: {
                    displayValue: "",
                    value: ""
                },
                selectedFilters: [],
                filters: [],
                category: definition.label,
                filterType: "choice",
                categoryId: definition.id,
                multiSelect: true,
                _valueLookup: {}
            };

            filterCategories.push(categoryLookup[definition.id]);
        }

        while (gr.next()) {
            for (var j = 0; j < filterDefinitions.length; j++) {
                var filterDefinition = filterDefinitions[j];
                var category = categoryLookup[filterDefinition.id];

                // Synthetic choices (e.g. My IT Assets Summary panel ids) aren't
                // backed by a literal field value — their presence is decided by
                // the choice's own matches(gr) predicate over this same record.
                if (filterDefinition.choices) {
                    for (var mIdx = 0; mIdx < filterDefinition.choices.length; mIdx++) {
                        var syntheticChoice = filterDefinition.choices[mIdx];
                        if (typeof syntheticChoice.matches !== "function") continue;
                        if (category._valueLookup[syntheticChoice.value]) continue;
                        if (syntheticChoice.matches(gr)) {
                            category._valueLookup[syntheticChoice.value] = true;
                            category.filters.push({
                                label: syntheticChoice.label,
                                value: syntheticChoice.value,
                                selected: false
                            });
                        }
                    }
                }

                var fields = filterDefinition.fields || [filterDefinition.field];

                for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
                    var field = fields[fieldIndex];
                    var element = gr.getElement(field);
                    if (!element || !element.canRead()) continue;
                    var value = element.getValue();
                    var label = element.getDisplayValue();

                    if (filterDefinition.choices) {
                        var choice = null;
                        for (var choiceIndex = 0; choiceIndex < filterDefinition.choices.length; choiceIndex++) {
                            var candidate = filterDefinition.choices[choiceIndex];
                            if (typeof candidate.matches === "function") continue;
                            if (candidate.value == value) {
                                choice = candidate;
                                break;
                            }
                        }
                        if (!choice) {
                            continue;
                        }
                        label = choice.label;
                    }

                    if (!value || category._valueLookup[value]) {
                        continue;
                    }

                    category._valueLookup[value] = true;

                    category.filters.push({
                        label: label,
                        value: value,
                        selected: false
                    });
                }
            }
        }

        for (var k = 0; k < filterCategories.length; k++) {
            var choices = filterDefinitions[k].choices;
            if (choices) {
                // Keep choice order stable across translations. staticChoices
                // definitions expose the full choice list; the rest are trimmed
                // to the values actually present in the results.
                var availableValues = filterCategories[k]._valueLookup;
                var useAllChoices = filterDefinitions[k].staticChoices === true;
                var selectedValue = selectedByCategory && selectedByCategory[filterDefinitions[k].id];
                filterCategories[k].filters = choices.filter(function(choice) {
                    return useAllChoices || availableValues[choice.value];
                }).map(function(choice) {
                    return { label: choice.label, value: choice.value, selected: !!selectedValue && choice.value == selectedValue };
                });
            } else {
                filterCategories[k].filters.sort(function(a, b) {
                    return a.label.localeCompare(b.label);
                });
            }

            delete filterCategories[k]._valueLookup;
        }

        // Use field IDs so the requested order is preserved across translations.
        var filterOrder = ["assigned_to", "cost_center", "assigned_to.cost_center", "location", "install_status", "model_category"];
        filterCategories.sort(function(a, b) {
            var aIndex = filterOrder.indexOf(a.categoryId);
            var bIndex = filterOrder.indexOf(b.categoryId);
            if (aIndex < 0) aIndex = filterOrder.length;
            if (bIndex < 0) bIndex = filterOrder.length;
            return aIndex - bIndex || a.category.localeCompare(b.category);
        });

        return filterCategories;
    },

    /**
     * Returns the label color map.
     */
    getLabelColorBackground: function() {
        var labelColorMap = AssetWidgetUtilsExtension.LABEL_COLOR_MAP;
        var localisedLabelColorMap = {};

        if (this.sessionLanguage == "en") {
            return labelColorMap;
        }

        for (var key in labelColorMap) {
            if (labelColorMap.hasOwnProperty(key)) {
                var translatedKey = gs.getMessage(key);
                localisedLabelColorMap[translatedKey] = labelColorMap[key];
            }
        }

        return localisedLabelColorMap;
    },

    /**
     * Returns the hardware model icon map.
     */
    getHardwareModelIcon: function() {
        return AssetWidgetUtilsExtension.HARDWARE_MODEL_ICON_MAP;
    },

    _getHardwareInstallStatusQuery: function(statusFilter) {
        var DEFAULT_STATUS_QUERY =
            "install_status=2^ORinstall_status=9^ORinstall_status=1^ORinstall_status=3^ORinstall_status=8";

        if (!statusFilter) {
            return DEFAULT_STATUS_QUERY;
        }

        statusFilter = statusFilter.toString().toLowerCase().trim();

        var definition = this._getPanelDefinition(statusFilter);
        if (definition && definition.appliesTo === "hardware" && definition.query) {
            return definition.query;
        }

        return DEFAULT_STATUS_QUERY;
    },

    /**
     * Looks up a My IT Assets Summary panel definition by id.
     *
     * @param {String} id
     * @returns {Object|null}
     */
    _getPanelDefinition: function(id) {
        var definitions = new global.MyAssetsSummaryConfig().getPanelDefinitions();
        for (var i = 0; i < definitions.length; i++) {
            if (definitions[i].id === id) {
                return definitions[i];
            }
        }
        return null;
    },

    type: "AssetWidgetUtilsExtension"
};

// Local constants because this Script Include no longer extends sn_itam_common.AssetWidgetUtils.
AssetWidgetUtilsExtension.DEFAULT_LIMIT = 10;

AssetWidgetUtilsExtension.INTRANSIT_STATUS = "9";
AssetWidgetUtilsExtension.RESERVED_SUBSTATUS = "reserved";

AssetWidgetUtilsExtension.RECEIVE_BUTTON_LABEL = gs.getMessage("Receive");
AssetWidgetUtilsExtension.REFRESH_ASSET_LABEL = gs.getMessage("Confirm");
AssetWidgetUtilsExtension.ATTESTATION_URL =
    "?id=sn_itam_asset_attestation&sys_id=";

AssetWidgetUtilsExtension.LABEL_COLOR_MAP = {
    "On order": "label-info-color",
    "In stock": "label-info-color",
    "In transit": "label-info-color",
    "In use": "label-success-color",
    "In maintenance": "label-warning-color",
    "Retired": "label-success-color",
    "Missing": "label-danger-color",
    "Build": "label-info-color",
    "Subscription": "label-info-color"
};

AssetWidgetUtilsExtension.HARDWARE_MODEL_ICON_MAP = {
    "Computer": "fa-laptop",
    "Personal Computer": "fa-laptop",
    "Handheld Computing Device": "fa-mobile",
    "Mobile Device": "fa-mobile",
    "Software": "fa-gear",
    "Printer": "fa-print"
};
