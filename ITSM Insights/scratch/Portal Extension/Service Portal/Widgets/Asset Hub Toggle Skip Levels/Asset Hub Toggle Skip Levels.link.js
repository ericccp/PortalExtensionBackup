function link(scope, element, attrs, c) {
    // uib-popover-html content isn't compiled, so the portal's tooltip setup never
    // reaches the toggle inside it; delegate from the wrapper to catch it on hover.
    element.tooltip({ selector: '.popover [data-toggle="tooltip"]' });
    scope.$on('$destroy', function() {
        element.tooltip('destroy');
    });

    angular.element(window).on("resize", function() {
        if (window.innerWidth <= 767)
            c.isMobile = true;
        else c.isMobile = false;
    });
}