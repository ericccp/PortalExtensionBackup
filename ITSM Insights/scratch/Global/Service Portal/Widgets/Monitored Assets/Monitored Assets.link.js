function link(scope, element) {
    // One delegated tooltip for every chart mark carrying data-tip, so hovering needs no digest
    var root = element[0].querySelector('.monitored-assets');
    var tooltip = element[0].querySelector('.monitored-assets__tooltip');
    if (!root || !tooltip) return;

    function markFrom(target) {
        while (target && target !== root) {
            if (target.getAttribute && target.getAttribute('data-tip')) return target;
            target = target.parentNode;
        }
        return null;
    }

    // Sits above the pointer, kept inside the card so it never causes horizontal scroll
    function place(event) {
        var bounds = root.getBoundingClientRect();
        var x = event.clientX - bounds.left;
        var y = event.clientY - bounds.top;
        var half = tooltip.offsetWidth / 2;
        x = Math.max(half, Math.min(x, bounds.width - half));
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function onOver(event) {
        var mark = markFrom(event.target);
        if (!mark) return;
        tooltip.textContent = mark.getAttribute('data-tip');
        tooltip.classList.add('monitored-assets__tooltip--visible');
        place(event);
    }

    function onMove(event) {
        if (tooltip.classList.contains('monitored-assets__tooltip--visible')) place(event);
    }

    function onOut(event) {
        if (markFrom(event.target) && !markFrom(event.relatedTarget))
            tooltip.classList.remove('monitored-assets__tooltip--visible');
    }

    root.addEventListener('mouseover', onOver);
    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseout', onOut);

    scope.$on('$destroy', function () {
        root.removeEventListener('mouseover', onOver);
        root.removeEventListener('mousemove', onMove);
        root.removeEventListener('mouseout', onOut);
    });
}
