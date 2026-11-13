function link(scope, element, attrs, controller) {
  // Close the location menu when clicking outside it. select2 renders its results list and
  // click-catching mask on <body>, so clicks on those count as inside.
  var INSIDE_SELECTOR = '.location-filter, .select2-drop, .select2-drop-mask';

  function onMouseDown(event) {
    if (!controller.showLocations || $(event.target).closest(INSIDE_SELECTOR).length)
      return;
    scope.$apply(controller.cancelLocations);
  }

  // Escape closes the menu, unless a select2 results list is open (Escape closes that first)
  function onKeyDown(event) {
    if (event.key !== 'Escape' || !controller.showLocations || $('.select2-drop-active:visible').length)
      return;
    scope.$apply(controller.cancelLocations);
    element.find('.location-filter > button').focus();
  }

  // Capture phase, so these run before select2 can swallow the event, re-render the target or close its list
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  scope.$on('$destroy', function() {
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
  });
}
