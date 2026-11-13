api.controller=function($scope, $window, $location) {

    // ============================================================
    // ASSET METRIC CARD
    // Service Portal Client Controller
    // ============================================================

    var c = this;
    // Format display text only; keep source values and date calculations unchanged.
    // Month-first display dates and ISO dates retain their displayed calendar day.
    c.formatDateText = function(value) {
        if (typeof value !== 'string') {
            return value;
        }
        return value.replace(/\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s?[AaPp][Mm]|Z|[+-]\d{2}:?\d{2})?)?\b/g, function(match, date) {
            var parts = date.split(/[-\/]/);
            var yearFirst = parts[0].length === 4;
            var year = Number(parts[yearFirst ? 0 : 2]);
            var month = Number(parts[yearFirst ? 1 : 0]);
            var day = Number(parts[yearFirst ? 2 : 1]);
            var leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
            var daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
                return match;
            }
            return ('0' + month).slice(-2) + '/' + ('0' + day).slice(-2) + '/' + parts[yearFirst ? 0 : 2];
        });
    };



    // ============================================================
    // INITIALIZE
    // ============================================================

    c.$onInit = function() {

        normalizeData();

    };


    // ============================================================
    // NORMALIZE SERVER DATA
    // ============================================================

    function normalizeData() {

        c.data.open_in_new_window = toBoolean(
            c.data.open_in_new_window
        );

        c.data.show_chevron = toBoolean(
            c.data.show_chevron
        );

        c.data.compact_mobile = toBoolean(
            c.data.compact_mobile
        );

        c.data.allow_wrap = toBoolean(
            c.data.allow_wrap
        );

    }


    // ============================================================
    // NAVIGATION
    //
    // The current HTML uses an <a> overlay, so this is not strictly
    // required for standard mouse/touch navigation.
    //
    // It is exposed so the widget can later support custom actions,
    // button behavior, or event-driven navigation without rewriting
    // the controller.
    // ============================================================

    c.openCard = function() {

        var link = c.data.card_link;

        if (!link) {
            return;
        }


        // --------------------------------------------------------
        // Open external/new-window destinations
        // --------------------------------------------------------

        if (c.data.open_in_new_window) {

            $window.open(
                link,
                '_blank',
                'noopener,noreferrer'
            );

            return;
        }


        // --------------------------------------------------------
        // Service Portal internal navigation
        // --------------------------------------------------------

        if (isInternalPortalLink(link)) {

            $location.url(
                getInternalPortalPath(link)
            );

            return;
        }


        // --------------------------------------------------------
        // Normal navigation fallback
        // --------------------------------------------------------

        $window.location.href = link;

    };


    // ============================================================
    // KEYBOARD INTERACTION
    //
    // This is useful if you later decide to make the containing
    // div itself focusable rather than relying exclusively on
    // the overlay anchor.
    // ============================================================

    c.handleKeydown = function(event) {

        if (!event) {
            return;
        }

        var key = event.key || event.keyCode;


        // Enter
        if (key === 'Enter' || key === 13) {

            event.preventDefault();

            c.openCard();

            return;
        }


        // Space
        if (
            key === ' ' ||
            key === 'Spacebar' ||
            key === 32
        ) {

            event.preventDefault();

            c.openCard();

        }

    };


    // ============================================================
    // DISPLAY HELPERS
    // ============================================================

    c.hasIcon = function() {

        return Boolean(
            c.data.icon ||
            c.data.icon_class
        );

    };


    c.hasSubtitle = function() {

        return Boolean(
            c.data.subtitle
        );

    };


    c.isClickable = function() {

        return Boolean(
            c.data.card_link
        );

    };


    c.shouldShowChevron = function() {

        return Boolean(
            c.data.show_chevron &&
            c.data.card_link
        );

    };


    // ============================================================
    // OPTIONAL DYNAMIC UPDATE SUPPORT
    //
    // Allows future parent widgets or broadcasts to update the
    // card without rebuilding the component.
    //
    // Example:
    //
    // $scope.$broadcast(
    //     'assetMetricCard.update',
    //     {
    //         callout: 'Healthy',
    //         subtitle: 'No issues detected',
    //         state: 'success'
    //     }
    // );
    // ============================================================

    var unregisterUpdateListener =
        $scope.$on(
            'assetMetricCard.update',
            function(event, payload) {

                if (!payload) {
                    return;
                }

                updateCardData(payload);

            }
        );


    function updateCardData(payload) {

        var allowedFields = [
            'title',
            'callout',
            'subtitle',
            'icon',
            'icon_class',
            'state',
            'icon_color',
            'icon_background',
            'title_color',
            'callout_color',
            'subtitle_color',
            'card_background',
            'border_color',
            'callout_style',
            'card_link',
            'open_in_new_window',
            'show_chevron',
            'tooltip',
            'aria_label',
            'compact_mobile',
            'allow_wrap'
        ];


        allowedFields.forEach(
            function(field) {

                if (
                    Object.prototype.hasOwnProperty.call(
                        payload,
                        field
                    )
                ) {

                    c.data[field] = payload[field];

                }

            }
        );


        normalizeData();

    }


    // ============================================================
    // CLEANUP
    // ============================================================

    $scope.$on(
        '$destroy',
        function() {

            if (unregisterUpdateListener) {
                unregisterUpdateListener();
            }

        }
    );


    // ============================================================
    // HELPERS
    // ============================================================

    function toBoolean(value) {

        if (
            value === true ||
            value === false
        ) {

            return value;

        }


        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {

            return false;

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
     * Determines whether a link is intended to stay inside
     * Service Portal.
     *
     * Examples:
     *
     * ?id=asset_detail
     * /sp?id=asset_detail
     * /esc?id=asset_detail
     */
    function isInternalPortalLink(link) {

        if (!link) {
            return false;
        }


        return (
            link.indexOf('?') === 0 ||
            link.indexOf('/') === 0
        );

    }


    /**
     * Converts portal URLs into something Angular's $location
     * can use when appropriate.
     */
    function getInternalPortalPath(link) {

        if (!link) {
            return '';
        }


        // Already query-string based:
        // ?id=asset_detail
        if (link.indexOf('?') === 0) {
            return link;
        }


        // Extract query string from:
        // /sp?id=asset_detail
        // /esc?id=asset_detail
        var queryIndex = link.indexOf('?');


        if (queryIndex >= 0) {

            return link.substring(
                queryIndex
            );

        }


        return link;

    }

}