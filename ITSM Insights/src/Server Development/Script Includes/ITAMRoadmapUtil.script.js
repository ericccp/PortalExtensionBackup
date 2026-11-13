var ITAMRoadmapUtil = Class.create();
ITAMRoadmapUtil.prototype = {
    TABLE: 'x_1026751_itsm_ins_itam_proj',

    // Display order for statuses and workstreams; labels come from the choice list
    STATUS_ORDER: ['in_progress', 'planned', 'completed'],
    WORKSTREAM_ORDER: ['ham', 'sam', 'service_mapping', 'program'],

    // Shape-based icons so status never relies on color alone
    STATUS_ICONS: {
        in_progress: 'fa-adjust',
        planned: 'fa-circle-o',
        completed: 'fa-check-circle'
    },
    HEALTH_ICONS: {
        on_track: 'fa-check',
        at_risk: 'fa-exclamation-triangle',
        off_track: 'fa-times-circle'
    },
    WORKSTREAM_ICONS: {
        ham: 'fa-laptop',
        sam: 'fa-file-code-o',
        service_mapping: 'fa-sitemap',
        program: 'fa-flag-o'
    },

    initialize: function() {},

    /**
     * Returns active projects the user can read, ordered by order then name.
     * @param {string[]} [statuses] - limit to these status values (validated)
     */
    getProjects: function(statuses) {
        var projects = [];
        var gr = new GlideRecordSecure(this.TABLE);
        gr.addQuery('active', true);
        var valid = this._validStatuses(statuses);
        if (valid.length) {
            gr.addQuery('status', 'IN', valid.join(','));
        }
        gr.orderBy('order');
        gr.orderBy('name');
        gr.query();
        while (gr.next()) {
            projects.push(this._toProject(gr));
        }
        return projects;
    },

    /** Status metadata in display order, optionally limited to the given values. */
    getStatuses: function(statuses) {
        var valid = this._validStatuses(statuses);
        var order = valid.length ? valid : this.STATUS_ORDER;
        var labels = this._choiceLabels('status');
        var result = [];
        for (var i = 0; i < order.length; i++) {
            result.push({
                value: order[i],
                label: labels[order[i]] || order[i],
                icon: this.STATUS_ICONS[order[i]]
            });
        }
        return result;
    },

    /** Workstream metadata in display order. */
    getWorkstreams: function() {
        var labels = this._choiceLabels('workstream');
        var result = [];
        for (var i = 0; i < this.WORKSTREAM_ORDER.length; i++) {
            var value = this.WORKSTREAM_ORDER[i];
            result.push({ value: value, label: labels[value] || value, icon: this.WORKSTREAM_ICONS[value] });
        }
        return result;
    },

    /** Counts per status for the stats widget. */
    getStatusCounts: function() {
        var counts = { in_progress: 0, planned: 0, completed: 0, total: 0 };
        var ga = new GlideAggregate(this.TABLE);
        ga.addQuery('active', true);
        ga.addAggregate('COUNT');
        ga.groupBy('status');
        ga.query();
        while (ga.next()) {
            var status = ga.getValue('status');
            var count = parseInt(ga.getAggregate('COUNT'), 10) || 0;
            if (counts.hasOwnProperty(status)) {
                counts[status] = count;
            }
            counts.total += count;
        }
        return counts;
    },

    /**
     * Full detail for one active project, or null when it is missing, inactive or unreadable.
     * Adds scope, health, progress, owner, phase chain, goal and project team.
     */
    getProject: function(sysId) {
        if (!sysId || !/^[0-9a-f]{32}$/.test(String(sysId))) {
            return null;
        }
        var gr = new GlideRecordSecure(this.TABLE);
        if (!gr.get(sysId) || gr.getValue('active') !== '1') {
            return null;
        }
        var project = this._toProject(gr);
        var portal = new ITAMPortalUtil();
        project.scope = portal.toLines(gr.getValue('scope'));
        project.statusReportUrl = gr.getValue('status_report_url') || '';
        project.owner = gr.getValue('program_owner') ? portal.getPerson(gr.getValue('program_owner')) : null;
        project.team = portal.getProjectTeam(project.id);
        project.goal = this._refSummary(gr, 'goal', 'x_1026751_itsm_ins_itam_goal', 'name');
        project.previousPhase = this._refSummary(gr, 'parent_project', this.TABLE, 'name');
        project.nextPhases = [];
        var next = new GlideRecordSecure(this.TABLE);
        next.addQuery('parent_project', project.id);
        next.addQuery('active', true);
        next.orderBy('order');
        next.query();
        while (next.next()) {
            project.nextPhases.push({ id: next.getUniqueValue(), name: next.getValue('name') });
        }
        return project;
    },

    /**
     * Projects with both dates set, for the Gantt view. Dates come back raw (yyyy-MM-dd)
     * as startValue/endValue so the widget can position bars.
     */
    getScheduledProjects: function(statuses) {
        var all = this.getProjects(statuses);
        var scheduled = [];
        var unscheduled = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].startValue && all[i].endValue && all[i].endValue >= all[i].startValue) {
                scheduled.push(all[i]);
            } else {
                unscheduled.push(all[i]);
            }
        }
        return { scheduled: scheduled, unscheduled: unscheduled };
    },

    // Accepts an array or comma-separated string and keeps only known values
    _validStatuses: function(statuses) {
        if (!statuses) {
            return [];
        }
        var list = typeof statuses === 'string' ? statuses.split(',') : statuses;
        var valid = [];
        for (var i = 0; i < list.length; i++) {
            var value = String(list[i]).trim();
            if (this.STATUS_ORDER.indexOf(value) > -1 && valid.indexOf(value) === -1) {
                valid.push(value);
            }
        }
        return valid;
    },

    // Translated choice labels without querying sys_choice directly
    _choiceLabels: function(field) {
        var order = field === 'status' ? this.STATUS_ORDER : this.WORKSTREAM_ORDER;
        var labels = {};
        var gr = new GlideRecord(this.TABLE);
        for (var i = 0; i < order.length; i++) {
            gr.setValue(field, order[i]);
            labels[order[i]] = gr.getDisplayValue(field);
        }
        return labels;
    },

    _toProject: function(gr) {
        var status = gr.getValue('status');
        var workstream = gr.getValue('workstream');
        var health = gr.getValue('health');
        var start = gr.getValue('start_date') ? gr.getDisplayValue('start_date') : '';
        var end = gr.getValue('end_date') ? gr.getDisplayValue('end_date') : '';
        return {
            id: gr.getUniqueValue(),
            name: gr.getValue('name'),
            shortDescription: gr.getValue('short_description') || '',
            description: gr.getValue('description') || '',
            status: status,
            statusLabel: gr.getDisplayValue('status'),
            statusIcon: this.STATUS_ICONS[status] || 'fa-circle-o',
            workstream: workstream,
            workstreamLabel: gr.getDisplayValue('workstream'),
            workstreamIcon: this.WORKSTREAM_ICONS[workstream] || 'fa-flag-o',
            phase: gr.getValue('phase') || '',
            startDate: start,
            endDate: end,
            startValue: gr.getValue('start_date') || '',
            endValue: gr.getValue('end_date') || '',
            moreInfoUrl: gr.getValue('more_info_url') || '',
            percentComplete: this._percent(gr.getValue('percent_complete')),
            health: health || '',
            healthLabel: health ? gr.getDisplayValue('health') : '',
            healthIcon: this.HEALTH_ICONS[health] || '',
            goalId: gr.getValue('goal') || ''
        };
    },

    // Integer 0-100, or null when not set so the UI can hide the progress bar
    _percent: function(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        var n = parseInt(value, 10);
        if (isNaN(n)) {
            return null;
        }
        return Math.max(0, Math.min(100, n));
    },

    // {id, name} for a reference to an active record the user can read, else null
    _refSummary: function(gr, field, table, nameField) {
        var id = gr.getValue(field);
        if (!id) {
            return null;
        }
        var ref = new GlideRecordSecure(table);
        if (!ref.get(id) || (ref.isValidField('active') && ref.getValue('active') !== '1')) {
            return null;
        }
        return { id: id, name: ref.getValue(nameField) };
    },

    type: 'ITAMRoadmapUtil'
};
