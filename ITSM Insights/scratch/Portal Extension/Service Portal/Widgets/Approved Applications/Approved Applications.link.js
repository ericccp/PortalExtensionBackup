function link(scope, element) {
  var c = scope.c;
  var root = element[0];

  // Close an open filter dropdown when the user clicks anywhere outside it.
  function onDocumentClick(event) {
    if (!c.openFilter) return;
    var group = event.target.closest ? event.target.closest('.dropdown[data-filter-key]') : null;
    if (group && root.contains(group) && group.getAttribute('data-filter-key') === c.openFilter) return;
    scope.$apply(function() { c.openFilter = null; });
  }
  document.addEventListener('click', onDocumentClick, true);
  scope.$on('$destroy', function() {
    document.removeEventListener('click', onDocumentClick, true);
  });

  // Apply/Clear remove the menu that held focus; hand focus back to its toggle.
  scope.$watch('c.returnFocusTo', function(key) {
    if (!key) return;
    c.returnFocusTo = null;
    var toggle = root.querySelector('#filter-' + key);
    if (toggle) toggle.focus();
  });
}
