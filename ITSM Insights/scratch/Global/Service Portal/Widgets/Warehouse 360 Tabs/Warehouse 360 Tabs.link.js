function link(scope, element) {
    // Columns flagged "stretch" grow their last widget's card down to the bottom of the row. A flex chain
    // through sp-widget's wrappers didn't take on the instance, so the card gets a measured min-height
    // instead. Re-measured when the row resizes (other cards loading, window width, tab shown) and when
    // the DOM changes (embedded widgets rendering, Monitored Assets switching views).
    var root = element[0];
    var wide = window.matchMedia('(min-width: 992px)');
    var pending = false;

    var resizeObserver = new ResizeObserver(schedule);
    var mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    schedule();

    scope.$on('$destroy', function () {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        window.removeEventListener('resize', schedule);
    });

    function schedule() {
        if (pending) return;
        pending = true;
        window.requestAnimationFrame(function () {
            pending = false;
            stretchCards();
        });
    }

    function stretchCards() {
        var widgets = root.querySelectorAll('.w360-tabs__col--stretch > sp-widget:last-of-type');
        for (var i = 0; i < widgets.length; i++) {
            var row = widgets[i].parentNode.parentNode;
            resizeObserver.observe(row);
            var card = findCard(widgets[i]);
            if (!card) continue;
            // Cleared first so the card can shrink back when its own content got shorter
            card.style.minHeight = '';
            // Hidden tabs measure 0; narrow screens stack the columns
            if (!wide.matches || !row.offsetHeight) continue;
            var gap = parseFloat(window.getComputedStyle(card).marginBottom) || 0;
            var height = row.getBoundingClientRect().bottom - card.getBoundingClientRect().top - gap;
            if (height > card.offsetHeight) card.style.minHeight = height + 'px';
        }
    }

    // sp-widget and its wrapper divs each hold one visible element; the first element that doesn't
    // is the widget's root (the bordered card)
    function findCard(widget) {
        var el = widget;
        while (el.tagName === 'SP-WIDGET' || el.tagName === 'DIV') {
            var visible = [];
            for (var i = 0; i < el.children.length; i++) {
                if (el.children[i].offsetHeight) visible.push(el.children[i]);
            }
            if (visible.length !== 1) break;
            el = visible[0];
        }
        return el === widget ? null : el;
    }
}
