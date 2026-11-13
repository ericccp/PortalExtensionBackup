var ITAMPortalUtil = Class.create();
ITAMPortalUtil.prototype = {
    PREFIX: 'x_1026751_itsm_ins_',
    PROPERTY_PREFIX: 'x_1026751_itsm_ins.itam.',

    GROUPS: ['program_team', 'steering', 'advisory', 'stakeholder'],
    WORKSTREAM_ORDER: ['ham', 'sam', 'service_mapping', 'program'],
    GOAL_STATUS_ICONS: {
        on_track: 'fa-check',
        at_risk: 'fa-exclamation-triangle',
        off_track: 'fa-times-circle',
        not_started: 'fa-circle-o',
        complete: 'fa-check-circle'
    },
    OUTREACH_STATUS_ORDER: ['completed', 'in_progress', 'scheduled', 'to_be_scheduled', 'future', 'not_applicable'],
    OUTREACH_STATUS_ICONS: {
        completed: 'fa-check-circle',
        in_progress: 'fa-adjust',
        scheduled: 'fa-calendar-check-o',
        to_be_scheduled: 'fa-calendar-o',
        future: 'fa-clock-o',
        not_applicable: 'fa-minus'
    },
    RESOURCE_TYPE_ORDER: ['course', 'documentation', 'dashboard_guide', 'video', 'link'],
    RESOURCE_TYPE_ICONS: {
        course: 'fa-graduation-cap',
        documentation: 'fa-file-text-o',
        dashboard_guide: 'fa-bar-chart',
        video: 'fa-play-circle-o',
        link: 'fa-link'
    },
    FAQ_CATEGORY_ORDER: ['general', 'scope_roles', 'using_servicenow'],
    DOCUMENT_TYPE_ORDER: ['policy', 'standard', 'guideline', 'procedure'],
    DOCUMENT_TYPE_ICONS: {
        policy: 'fa-gavel',
        standard: 'fa-check-square-o',
        guideline: 'fa-compass',
        procedure: 'fa-list-ol'
    },
    ISSUE_STATUS_ORDER: ['investigating', 'workaround', 'resolved'],
    ISSUE_STATUS_ICONS: {
        investigating: 'fa-search',
        workaround: 'fa-wrench',
        resolved: 'fa-check-circle'
    },
    EVENT_TYPES: ['town_hall', 'training_session', 'office_hours'],

    initialize: function() {},

    // ---------------------------------------------------------------------
    // Settings
    // ---------------------------------------------------------------------

    /** Reads one of this app's ITAM portal properties (name without the prefix). */
    getSetting: function(name) {
        if (!name || !/^[a-z_]+$/.test(String(name))) {
            return '';
        }
        return String(gs.getProperty(this.PROPERTY_PREFIX + name, '') || '').trim();
    },

    // ---------------------------------------------------------------------
    // People
    // ---------------------------------------------------------------------

    /** Active members of a governance group, in order. */
    getPeople: function(group) {
        var people = [];
        if (this.GROUPS.indexOf(String(group)) === -1) {
            return people;
        }
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_group_member');
        gr.addQuery('group', group);
        gr.addQuery('active', true);
        gr.addQuery('person.active', true);
        gr.orderBy('order');
        gr.orderBy('person.name');
        gr.query();
        while (gr.next()) {
            var person = this.getPerson(gr.getValue('person'));
            if (!person) {
                continue;
            }
            person.memberId = gr.getUniqueValue();
            person.programRole = gr.getValue('program_role') || '';
            people.push(person);
        }
        return people;
    },

    /** People on a project team, in order. */
    getProjectTeam: function(projectId) {
        var team = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_project_member');
        gr.addQuery('project', projectId);
        gr.addQuery('person.active', true);
        gr.orderBy('order');
        gr.orderBy('person.name');
        gr.query();
        while (gr.next()) {
            var person = this.getPerson(gr.getValue('person'));
            if (!person) {
                continue;
            }
            person.memberId = gr.getUniqueValue();
            person.programRole = gr.getValue('role_on_project') || '';
            team.push(person);
        }
        return team;
    },

    /**
     * One person. Local fields win; empty ones fall back to the linked sys_user.
     * Returns null when the record is missing, inactive or unreadable.
     */
    getPerson: function(personId) {
        if (!personId) {
            return null;
        }
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_person');
        if (!gr.get(personId) || gr.getValue('active') !== '1') {
            return null;
        }
        var person = {
            id: gr.getUniqueValue(),
            name: gr.getValue('name') || '',
            title: gr.getValue('title') || '',
            department: gr.getValue('department') || '',
            email: gr.getValue('email') || '',
            photo: this._imageUrl(gr.getDisplayValue('photo')),
            bio: gr.getValue('bio') || ''
        };
        var userId = gr.getValue('user');
        if (userId) {
            var user = new GlideRecordSecure('sys_user');
            if (user.get(userId)) {
                person.name = person.name || user.getValue('name') || '';
                person.title = person.title || user.getValue('title') || '';
                person.department = person.department || user.getDisplayValue('department') || '';
                person.email = person.email || user.getValue('email') || '';
                person.photo = person.photo || this._imageUrl(user.getDisplayValue('photo'));
            }
        }
        person.initials = this._initials(person.name);
        person.sortName = this._sortName(person.name);
        person.letter = person.sortName.charAt(0).toUpperCase();
        return person;
    },

    // ---------------------------------------------------------------------
    // Goals
    // ---------------------------------------------------------------------

    /** Fiscal years that have active goals, newest first. */
    getFiscalYears: function() {
        var years = [];
        var ga = new GlideAggregate(this.PREFIX + 'itam_goal');
        ga.addQuery('active', true);
        ga.groupBy('fiscal_year');
        ga.orderBy('fiscal_year');
        ga.query();
        while (ga.next()) {
            var year = ga.getValue('fiscal_year');
            if (year) {
                years.push(year);
            }
        }
        return years;
    },

    /** Active goals with their linked active projects. Empty fiscalYear returns every year. */
    getGoals: function(fiscalYear) {
        var goals = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_goal');
        gr.addQuery('active', true);
        if (fiscalYear) {
            gr.addQuery('fiscal_year', fiscalYear);
        }
        gr.orderByDesc('fiscal_year');
        gr.orderBy('order');
        gr.orderBy('name');
        gr.query();
        while (gr.next()) {
            var status = gr.getValue('status');
            var quarter = gr.getValue('target_quarter');
            goals.push({
                id: gr.getUniqueValue(),
                name: gr.getValue('name'),
                description: gr.getValue('description') || '',
                fiscalYear: gr.getValue('fiscal_year') || '',
                targetQuarter: quarter ? gr.getDisplayValue('target_quarter') : '',
                criteria: this.toLines(gr.getValue('success_criteria')),
                percentComplete: Math.max(0, Math.min(100, parseInt(gr.getValue('percent_complete'), 10) || 0)),
                status: status,
                statusLabel: gr.getDisplayValue('status'),
                statusIcon: this.GOAL_STATUS_ICONS[status] || 'fa-circle-o',
                projects: this._goalProjects(gr.getUniqueValue())
            });
        }
        return goals;
    },

    _goalProjects: function(goalId) {
        var projects = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_proj');
        gr.addQuery('goal', goalId);
        gr.addQuery('active', true);
        gr.orderBy('order');
        gr.query();
        while (gr.next()) {
            projects.push({ id: gr.getUniqueValue(), name: gr.getValue('name'), status: gr.getValue('status') });
        }
        return projects;
    },

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /**
     * Active events of a type. mode 'upcoming' returns the soonest first;
     * 'past' returns the most recent first. limit <= 0 means no limit.
     */
    getEvents: function(type, mode, limit) {
        var events = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_event');
        gr.addQuery('active', true);
        if (this.EVENT_TYPES.indexOf(String(type)) > -1) {
            gr.addQuery('type', type);
        }
        var now = new GlideDateTime().getValue();
        if (mode === 'upcoming') {
            gr.addQuery('starts', '>=', now);
            gr.orderBy('starts');
        } else {
            gr.addQuery('starts', '<', now);
            gr.orderByDesc('starts');
        }
        if (limit > 0) {
            gr.setLimit(limit);
        }
        gr.query();
        while (gr.next()) {
            var gdt = new GlideDateTime(gr.getValue('starts'));
            var localDate = gdt.getLocalDate();
            events.push({
                id: gr.getUniqueValue(),
                title: gr.getValue('title'),
                type: gr.getValue('type'),
                typeLabel: gr.getDisplayValue('type'),
                dateLabel: localDate.getByFormat('MMMM d, yyyy'),
                shortDate: localDate.getByFormat('MM.dd.yy'),
                year: localDate.getByFormat('yyyy'),
                month: localDate.getByFormat('MMM'),
                day: localDate.getByFormat('d'),
                time: gdt.getLocalTime().getByFormat('h:mm a'),
                isoDate: localDate.getByFormat('yyyy-MM-dd'),
                summary: gr.getValue('summary') || '',
                meetingUrl: gr.getValue('meeting_url') || '',
                recordingUrl: gr.getValue('recording_url') || '',
                notesUrl: gr.getValue('notes_url') || ''
            });
        }
        return events;
    },

    // ---------------------------------------------------------------------
    // Outreach
    // ---------------------------------------------------------------------

    /**
     * Department x workstream grid. Only workstreams with at least one row become columns.
     * Each department carries a cells array aligned with workstreams.
     */
    getOutreachMatrix: function() {
        var statusLabels = this._labels('itam_outreach', 'status', this.OUTREACH_STATUS_ORDER);
        var wsLabels = this._labels('itam_outreach', 'workstream', this.WORKSTREAM_ORDER);
        var byDept = {};
        var deptOrder = [];
        var usedWs = {};
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_outreach');
        gr.orderBy('order');
        gr.orderBy('department');
        gr.query();
        while (gr.next()) {
            var dept = gr.getValue('department');
            var ws = gr.getValue('workstream');
            var status = gr.getValue('status');
            if (!byDept[dept]) {
                byDept[dept] = {};
                deptOrder.push(dept);
            }
            usedWs[ws] = true;
            byDept[dept][ws] = {
                status: status,
                label: statusLabels[status] || status,
                icon: this.OUTREACH_STATUS_ICONS[status] || 'fa-circle-o',
                date: gr.getValue('scheduled_date') ? gr.getDisplayValue('scheduled_date') : '',
                notes: gr.getValue('notes') || ''
            };
        }

        var workstreams = [];
        var i;
        for (i = 0; i < this.WORKSTREAM_ORDER.length; i++) {
            if (usedWs[this.WORKSTREAM_ORDER[i]]) {
                workstreams.push({ value: this.WORKSTREAM_ORDER[i], label: wsLabels[this.WORKSTREAM_ORDER[i]] });
            }
        }

        var departments = [];
        for (i = 0; i < deptOrder.length; i++) {
            var cells = [];
            for (var w = 0; w < workstreams.length; w++) {
                cells.push(byDept[deptOrder[i]][workstreams[w].value] || null);
            }
            departments.push({ name: deptOrder[i], cells: cells });
        }

        var statuses = [];
        for (i = 0; i < this.OUTREACH_STATUS_ORDER.length; i++) {
            var value = this.OUTREACH_STATUS_ORDER[i];
            statuses.push({ value: value, label: statusLabels[value], icon: this.OUTREACH_STATUS_ICONS[value] });
        }
        return { workstreams: workstreams, departments: departments, statuses: statuses };
    },

    // ---------------------------------------------------------------------
    // Learning
    // ---------------------------------------------------------------------

    /** Active resources grouped by type, in type order. Empty groups are dropped. */
    getResources: function(types) {
        var allowed = this._valid(types, this.RESOURCE_TYPE_ORDER);
        var labels = this._labels('itam_resource', 'type', this.RESOURCE_TYPE_ORDER);
        var groups = {};
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_resource');
        gr.addQuery('active', true);
        gr.addQuery('type', 'IN', allowed.join(','));
        gr.orderBy('order');
        gr.orderBy('title');
        gr.query();
        while (gr.next()) {
            var type = gr.getValue('type');
            var url = gr.getValue('url') || this._kbUrl(gr.getValue('kb_article'));
            (groups[type] = groups[type] || []).push({
                id: gr.getUniqueValue(),
                title: gr.getValue('title'),
                type: type,
                icon: this.RESOURCE_TYPE_ICONS[type],
                description: gr.getValue('description') || '',
                audience: gr.getValue('audience') || '',
                duration: parseInt(gr.getValue('duration_minutes'), 10) || 0,
                url: url,
                external: /^https?:/i.test(url)
            });
        }
        var result = [];
        for (var i = 0; i < allowed.length; i++) {
            if (groups[allowed[i]]) {
                result.push({ value: allowed[i], label: labels[allowed[i]], icon: this.RESOURCE_TYPE_ICONS[allowed[i]], items: groups[allowed[i]] });
            }
        }
        return result;
    },

    /** Active FAQs grouped by category, in category order. */
    getFaqs: function() {
        var labels = this._labels('itam_faq', 'category', this.FAQ_CATEGORY_ORDER);
        var groups = {};
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_faq');
        gr.addQuery('active', true);
        gr.orderBy('order');
        gr.orderBy('question');
        gr.query();
        while (gr.next()) {
            var category = gr.getValue('category');
            (groups[category] = groups[category] || []).push({
                id: gr.getUniqueValue(),
                question: gr.getValue('question'),
                answer: gr.getValue('answer') || '',
                text: this._plain(gr.getValue('answer'))
            });
        }
        var result = [];
        for (var i = 0; i < this.FAQ_CATEGORY_ORDER.length; i++) {
            var value = this.FAQ_CATEGORY_ORDER[i];
            if (groups[value]) {
                result.push({ value: value, label: labels[value], items: groups[value] });
            }
        }
        return result;
    },

    /** Active glossary terms A-Z, with See also names resolved to term ids. */
    getGlossary: function() {
        var terms = [];
        var byName = {};
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_glossary_term');
        gr.addQuery('active', true);
        gr.orderBy('term');
        gr.query();
        while (gr.next()) {
            var term = {
                id: gr.getUniqueValue(),
                term: gr.getValue('term'),
                definition: gr.getValue('definition') || '',
                text: this._plain(gr.getValue('definition')),
                seeAlsoNames: String(gr.getValue('see_also') || '').split(','),
                seeAlso: []
            };
            term.letter = term.term.charAt(0).toUpperCase();
            byName[term.term.toLowerCase()] = term;
            terms.push(term);
        }
        for (var i = 0; i < terms.length; i++) {
            for (var j = 0; j < terms[i].seeAlsoNames.length; j++) {
                var match = byName[terms[i].seeAlsoNames[j].trim().toLowerCase()];
                if (match && match.id !== terms[i].id) {
                    terms[i].seeAlso.push({ id: match.id, term: match.term });
                }
            }
            delete terms[i].seeAlsoNames;
        }
        return terms;
    },

    /**
     * Index for glossary tooltips in other widgets: active terms with Show as tooltip on.
     * forms lists every spelling to match: the term, the term and abbreviation split out of
     * "Name (ABBR)", and the editor's aliases. Definitions are plain text, shortened for a tooltip.
     */
    getGlossaryTooltips: function() {
        var terms = [];
        if (this.getSetting('glossary_tooltips') === 'false') {
            return terms;
        }
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_glossary_term');
        gr.addQuery('active', true);
        gr.addQuery('show_tooltip', true);
        gr.orderBy('term');
        gr.query();
        while (gr.next()) {
            var name = gr.getValue('term') || '';
            var forms = this._termForms(name, gr.getValue('aliases'));
            if (!forms.length) {
                continue;
            }
            terms.push({
                id: gr.getUniqueValue(),
                term: name,
                forms: forms,
                definition: this._truncate(this._plain(gr.getValue('definition')), 280)
            });
        }
        return terms;
    },

    _termForms: function(name, aliases) {
        var candidates = [];
        var match = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(name);
        if (match) {
            candidates.push(match[1], match[2]);
        } else {
            candidates.push(name);
        }
        var extra = String(aliases || '').split(',');
        for (var i = 0; i < extra.length; i++) {
            candidates.push(extra[i]);
        }
        var forms = [];
        var seen = {};
        for (var j = 0; j < candidates.length; j++) {
            var form = String(candidates[j] || '').replace(/\s+/g, ' ').trim();
            var key = form.toLowerCase();
            if (form.length < 2 || seen[key]) {
                continue;
            }
            seen[key] = true;
            forms.push(form);
        }
        return forms;
    },

    _truncate: function(text, max) {
        if (text.length <= max) {
            return text;
        }
        var cut = text.substring(0, max);
        var space = cut.lastIndexOf(' ');
        return (space > max / 2 ? cut.substring(0, space) : cut) + '\u2026';
    },

    // ---------------------------------------------------------------------
    // Policy & Help
    // ---------------------------------------------------------------------

    /** Active documents of the given types, policies first. */
    getDocuments: function(types) {
        var allowed = this._valid(types, this.DOCUMENT_TYPE_ORDER);
        var docs = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_document');
        gr.addQuery('active', true);
        gr.addQuery('type', 'IN', allowed.join(','));
        gr.orderBy('order');
        gr.orderBy('title');
        gr.query();
        while (gr.next()) {
            var type = gr.getValue('type');
            var url = this._kbUrl(gr.getValue('kb_article')) || gr.getValue('url') || '';
            docs.push({
                id: gr.getUniqueValue(),
                title: gr.getValue('title'),
                type: type,
                typeLabel: gr.getDisplayValue('type'),
                icon: this.DOCUMENT_TYPE_ICONS[type],
                rank: allowed.indexOf(type),
                summary: gr.getValue('summary') || '',
                keyPoints: this.toLines(gr.getValue('key_points')),
                owner: gr.getValue('owner') || '',
                version: gr.getValue('version') || '',
                approved: gr.getValue('approved_date') ? gr.getDisplayValue('approved_date') : '',
                nextReview: gr.getValue('next_review_date') ? gr.getDisplayValue('next_review_date') : '',
                // yyyy-MM-dd values for sorting and date comparisons
                approvedValue: gr.getValue('approved_date') || '',
                nextReviewValue: gr.getValue('next_review_date') || '',
                url: url,
                external: /^https?:/i.test(url)
            });
        }
        docs.sort(function(a, b) {
            return a.rank - b.rank;
        });
        return docs;
    },

    /** Active known issues, open ones first, newest first within a status. */
    getKnownIssues: function() {
        var issues = [];
        var gr = new GlideRecordSecure(this.PREFIX + 'itam_known_issue');
        gr.addQuery('active', true);
        gr.orderByDesc('opened');
        gr.query();
        while (gr.next()) {
            var status = gr.getValue('status');
            issues.push({
                id: gr.getUniqueValue(),
                title: gr.getValue('title'),
                description: gr.getValue('description') || '',
                workaround: gr.getValue('workaround') || '',
                area: gr.getValue('affected_area') || '',
                status: status,
                statusLabel: gr.getDisplayValue('status'),
                statusIcon: this.ISSUE_STATUS_ICONS[status] || 'fa-circle-o',
                rank: this.ISSUE_STATUS_ORDER.indexOf(status),
                opened: gr.getValue('opened') ? gr.getDisplayValue('opened') : '',
                resolved: gr.getValue('resolved') ? gr.getDisplayValue('resolved') : '',
                resolvedFlag: status === 'resolved'
            });
        }
        // Array.sort is not stable in Rhino, so tie-break on the original position
        for (var i = 0; i < issues.length; i++) {
            issues[i].position = i;
        }
        issues.sort(function(a, b) {
            return a.rank - b.rank || a.position - b.position;
        });
        return issues;
    },

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /** Splits multi-line text into trimmed, non-empty lines (leading bullets removed). */
    toLines: function(text) {
        var lines = [];
        var parts = String(text || '').split(/\r?\n/);
        for (var i = 0; i < parts.length; i++) {
            var line = parts[i].replace(/^\s*[-*•]\s*/, '').trim();
            if (line) {
                lines.push(line);
            }
        }
        return lines;
    },

    _kbUrl: function(kbId) {
        return kbId ? '?id=kb_article&sys_id=' + kbId : '';
    },

    _imageUrl: function(displayValue) {
        var value = String(displayValue || '');
        if (!value) {
            return '';
        }
        return value.charAt(0) === '/' ? value : '/' + value;
    },

    _initials: function(name) {
        var parts = String(name || '').replace(/[^A-Za-z\s'-]/g, ' ').trim().split(/\s+/);
        if (!parts[0]) {
            return '?';
        }
        var first = parts[0].charAt(0);
        var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
        return (first + last).toUpperCase();
    },

    // Sort and A-Z filter by last name
    _sortName: function(name) {
        var parts = String(name || '').trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ') : parts[0] || '';
    },

    // Plain text of an HTML field, for client-side search
    _plain: function(html) {
        return String(html || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Keeps the requested values that are allowed, in allowed order; all of them when none requested
    _valid: function(requested, allowed) {
        if (!requested) {
            return allowed.slice();
        }
        var list = typeof requested === 'string' ? requested.split(',') : requested;
        var trimmed = [];
        for (var i = 0; i < list.length; i++) {
            trimmed.push(String(list[i]).trim());
        }
        var valid = [];
        for (var j = 0; j < allowed.length; j++) {
            if (trimmed.indexOf(allowed[j]) > -1) {
                valid.push(allowed[j]);
            }
        }
        return valid.length ? valid : allowed.slice();
    },

    // Translated choice labels without querying sys_choice directly
    _labels: function(table, field, values) {
        var labels = {};
        var gr = new GlideRecord(this.PREFIX + table);
        for (var i = 0; i < values.length; i++) {
            gr.setValue(field, values[i]);
            labels[values[i]] = gr.getDisplayValue(field) || values[i];
        }
        return labels;
    },

    type: 'ITAMPortalUtil'
};
