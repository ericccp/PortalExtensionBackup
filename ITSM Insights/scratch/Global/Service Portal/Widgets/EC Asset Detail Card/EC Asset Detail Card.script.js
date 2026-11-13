(function() {

    // ============================================================
    // ASSET METRIC CARD
    // Reusable Service Portal widget server script
    // ============================================================

    var DEFAULT_STATE = 'neutral';

    var VALID_STATES = [
        'neutral',
        'info',
        'blue',
        'success',
        'green',
        'warning',
        'amber',
        'danger',
        'red',
        'purple'
    ];

    var VALID_CALLOUT_STYLES = [
        'default',
        'success',
        'warning',
        'danger',
        'muted'
    ];


    // ============================================================
    // CONTENT
    // ============================================================

    data.title = getStringOption(
        'title',
        ''
    );

    data.callout = getStringOption(
        'callout',
        ''
    );

    data.subtitle = getStringOption(
        'subtitle',
        ''
    );


    // ============================================================
    // ICON
    // ============================================================

    data.icon = getStringOption(
        'icon',
        ''
    );

    data.icon_class = getStringOption(
        'icon_class',
        ''
    );


    // ============================================================
    // STATE / COLOR SCHEME
    // ============================================================

    data.state = normalizeState(
        getStringOption(
            'color_scheme',
            DEFAULT_STATE
        )
    );


    // ============================================================
    // CUSTOM ICON COLORS
    // ============================================================

    data.icon_color = getStringOption(
        'icon_color',
        ''
    );

    data.icon_background = getStringOption(
        'icon_background',
        ''
    );


    // ============================================================
    // TEXT COLORS
    // ============================================================

    data.title_color = getStringOption(
        'title_color',
        ''
    );

    data.callout_color = getStringOption(
        'callout_color',
        ''
    );

    data.subtitle_color = getStringOption(
        'subtitle_color',
        ''
    );


    // ============================================================
    // CARD COLORS
    // ============================================================

    data.card_background = getStringOption(
        'card_background',
        ''
    );

    data.border_color = getStringOption(
        'border_color',
        ''
    );


    // ============================================================
    // CALLOUT STYLE
    // ============================================================

    data.callout_style = normalizeCalloutStyle(
        getStringOption(
            'callout_style',
            'default'
        )
    );


    // ============================================================
    // INTERACTION
    // ============================================================

    data.card_link = getStringOption(
        'card_link',
        ''
    );

    data.open_in_new_window = getBooleanOption(
        'open_in_new_window',
        false
    );

    data.show_chevron = getBooleanOption(
        'show_chevron',
        false
    );


    // ============================================================
    // ACCESSIBILITY / HELP
    // ============================================================

    data.tooltip = getStringOption(
        'tooltip',
        ''
    );

    data.aria_label = getStringOption(
        'aria_label',
        ''
    );


    // ============================================================
    // RESPONSIVE / DISPLAY OPTIONS
    // ============================================================

    data.compact_mobile = getBooleanOption(
        'compact_mobile',
        false
    );

    data.allow_wrap = getBooleanOption(
        'allow_wrap',
        false
    );


    // ============================================================
    // FALLBACK ARIA LABEL
    // ============================================================

    if (!data.aria_label) {
        data.aria_label = buildAriaLabel();
    }


    // ============================================================
    // OPTIONAL SERVER-SIDE OVERRIDE AREA
    //
    // This section is intentionally left as the extension point
    // for dynamic cards.
    //
    // Example:
    //
    // data.title = 'Warranty';
    // data.callout = 'Expires in 24 days';
    // data.subtitle = 'October 1, 2026';
    // data.state = 'warning';
    //
    // ============================================================


    // ============================================================
    // HELPERS
    // ============================================================

    /**
     * Returns a widget option as a trimmed string.
     *
     * @param {String} name
     * @param {String} defaultValue
     * @returns {String}
     */
    function getStringOption(name, defaultValue) {

        var value = options[name];

        if (value === null || value === undefined) {
            return defaultValue || '';
        }

        value = String(value).trim();

        if (!value) {
            return defaultValue || '';
        }

        return value;
    }


    /**
     * Returns a widget option as a boolean.
     *
     * Service Portal widget options commonly arrive as strings,
     * so normalize both boolean and string values.
     *
     * @param {String} name
     * @param {Boolean} defaultValue
     * @returns {Boolean}
     */
    function getBooleanOption(name, defaultValue) {

        var value = options[name];

        if (value === null || value === undefined || value === '') {
            return defaultValue === true;
        }

        if (value === true || value === false) {
            return value;
        }

        value = String(value)
            .trim()
            .toLowerCase();

        return (
            value === 'true' ||
            value === '1' ||
            value === 'yes' ||
            value === 'y'
        );
    }


    /**
     * Ensures the configured card state is supported.
     *
     * @param {String} state
     * @returns {String}
     */
    function normalizeState(state) {

        state = String(state || '')
            .trim()
            .toLowerCase();

        if (VALID_STATES.indexOf(state) === -1) {
            return DEFAULT_STATE;
        }

        return state;
    }


    /**
     * Ensures the callout style matches a supported CSS class.
     *
     * @param {String} style
     * @returns {String}
     */
    function normalizeCalloutStyle(style) {

        style = String(style || '')
            .trim()
            .toLowerCase();

        if (VALID_CALLOUT_STYLES.indexOf(style) === -1) {
            return 'default';
        }

        return style;
    }


    /**
     * Creates a useful accessibility label when one was not
     * explicitly configured.
     *
     * Example:
     * "Warranty, Unknown, Expiration date not set"
     *
     * @returns {String}
     */
    function buildAriaLabel() {

        var parts = [];

        if (data.title) {
            parts.push(data.title);
        }

        if (data.callout) {
            parts.push(data.callout);
        }

        if (data.subtitle) {
            parts.push(data.subtitle);
        }

        if (parts.length === 0) {
            return 'Asset information';
        }

        return parts.join(', ');
    }

})();