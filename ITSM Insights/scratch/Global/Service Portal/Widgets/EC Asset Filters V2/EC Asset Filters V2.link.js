function link(scope, element, attrs, controller) {

    // Define key codes as constants for better readability
    var KEYS = {
        TAB: 9,
        ENTER: 13,
        SPACE: 32,
        ESCAPE: 27,
        UP: 38,
        DOWN: 40
    };

    var $timeout = $injector.get('$timeout');

    $(element).on('click', '#all-filters', function() {
        var width = $(window).width();
        var isTablet = width >= 768 && width <= 1024;

        if (isTablet) {
            // Use timeout to ensure modal-backdrop exists
            $timeout(function() {
                $('.modal-backdrop').hide();
            });
        }
    });

    if (window.ResizeObserver) {
        var spPageroot = document.querySelector(".sp-page-root");
				var desktopViewPreference = null;
        var resizeObserver = new ResizeObserver(function() {
            if ($('.sp-page-root').width() < 768) {
                controller.view = 'mobile';
                // Automatically switch to card view on mobile
                if (controller.data.view !== controller.CARD_VIEW) {
                    // Store desktop preference only if it was list view
                    desktopViewPreference = controller.data.view;
                    controller.data.view = controller.CARD_VIEW;
                    // Emit event to update the content display with Angular digest
                    scope.$apply(function() {
                        scope.$emit('sn_ex_sp.viewChanged', {
                            view: controller.CARD_VIEW
                        });
                    });
                }
                // If already in card view, don't store preference or emit event
            } else {
                $(".modal-backdrop").hide();
                controller.view = 'desktop';
                // Restore desktop view preference only if it was list view
                if (desktopViewPreference && desktopViewPreference === controller.LIST_VIEW && controller.data.view !== controller.LIST_VIEW) {
                    controller.data.view = desktopViewPreference;
                    // Emit event to update the content display with Angular digest
                    scope.$apply(function() {
                        scope.$emit('sn_ex_sp.viewChanged', {
                            view: desktopViewPreference
                        });
                    });
                    // Clear the preference after restoring
                    desktopViewPreference = null;
                }
                // If was already in card view, stay in card view (no change needed)
            }
            $timeout(controller.adaptFilters);
        });
        if (spPageroot)
            resizeObserver.observe(spPageroot);
    }

    // toggle mobile modal's filter group accordian
    $(element).on('keydown', '.accordion-toggle', function(e) {
        if ($(e.target) && (e.keyCode === 13 /*ENTER*/ || e.keyCode === 32 /*SPACE*/ )) {
            $(e.target).click();
        }
    });

    // close flyout modal when clicked outside modal
    $(element).on('click', '.modal.fade.modal-flyout.in', function(e) {
        var closeButton = angular.element(document.getElementById('ec-flyout-close-btn'));
        if ($(e.target).is('.modal.fade.modal-flyout.in')) {
            closeButton.click();
        }
    });

    // Helper function to find focusable elements for tab navigation
    function getFocusableElements(container) {
        return container.find('input:not([type="radio"]):not(:disabled), button:not(:disabled), [tabindex="0"]:not(:disabled)');
    }

    // Helper function to find all interactive elements including radio buttons
    function getAllInteractiveElements(container) {
        return container.find('input:not(:disabled), button:not(:disabled), [tabindex="0"]:not(:disabled)');
    }

    // Helper function to handle focus navigation
    function handleAccessibilityInDropdown(focusableElements, currentFocus, shiftPressed) {
        var currentIndex = focusableElements.index(currentFocus);
        var nextIndex;

        // Handle radio button navigation
        if (currentFocus.get(0).tagName === 'INPUT' && currentFocus.get(0).type === 'radio') {
            // Find all radio buttons in the same group
            var radioGroup = $(focusableElements).filter('input[type="radio"]');
            var nonRadioElements = $(focusableElements).filter('input:not([type="radio"]):not(:disabled), button:not(:disabled), [tabindex="0"]:not(:disabled)');
            var lastRadioInGroup = radioGroup.last()[0];

            // If we're at the last radio in the group, move to the next focusable element after the group
            if (currentFocus.get(0) === lastRadioInGroup) {
                if (!shiftPressed) { // only Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.first()[0]) || undefined;
                } else { // shift + Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.last()[0]) || undefined;
                }
            }
            // If we're at the first radio in the group and shift is pressed, move to the previous element
            else if (currentFocus.get(0) === radioGroup.first()[0]) {
                if (shiftPressed) { // shift + Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.last()[0]) || undefined;
                } else { // only Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.first()[0]) || undefined;
                }
            } else {
                if (shiftPressed) { // shift + Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.last()[0]) || undefined;
                } else { // only Tab pressed
                    nextIndex = focusableElements.index(nonRadioElements.first()[0]) || undefined;
                }
            }

            // if next index is undefined or out of bounds, close dropdown
            if (nextIndex == undefined || nextIndex >= focusableElements.length || nextIndex < 0) {
                var dropdownToggle = $(currentFocus).parents('.dropdown').find('.dropdown-toggle');
                dropdownToggle.dropdown('toggle');
                dropdownToggle.focus();
                return;
            }

            // Focus on next element if it's not disabled
            if (!$(focusableElements[nextIndex]).is(':disabled')) {
                focusableElements[nextIndex].focus();
                return;
            }
        }
        // Handle non-radio button navigation
        else if (currentFocus.get(0).type !== 'radio') {
            nextIndex = shiftPressed ? currentIndex - 1 : currentIndex + 1;
            // Handle circular navigation
            if (nextIndex >= focusableElements.length) {
                nextIndex = 0;
            } else if (nextIndex < 0) {
                nextIndex = focusableElements.length - 1;
            }

            // Focus on next element if it's not disabled
            if (!$(focusableElements[nextIndex]).is(':disabled')) {
                focusableElements[nextIndex].focus();
                return;
            }

            // Skip disabled elements
            var step = shiftPressed ? -1 : 1;
            var tempIndex = nextIndex + step;

            // Loop until finding an enabled element or coming back to starting point
            while (tempIndex >= 0 && tempIndex < focusableElements.length) {
                if (!$(focusableElements[tempIndex]).is(':disabled')) {
                    focusableElements[tempIndex].focus();
                    break;
                }
                tempIndex += step;

                // Handle wrapping around at the ends
                if (tempIndex === focusableElements.length) {
                    tempIndex = 0;
                } else if (tempIndex < 0) {
                    tempIndex = focusableElements.length - 1;
                }
            }
        }

    }

    // Set focus on first element when dropdown opens
    $(element).on('shown.bs.dropdown', function(e) {
        var dropdown = $(e.target);
        var dropdownMenu = dropdown.find('.dropdown-menu');
        var firstFocusableElement = getAllInteractiveElements(dropdownMenu).first();

        if (firstFocusableElement.length) {
            firstFocusableElement.focus();
        }
    });

    function getFilterByValue(filters, value) {
        for (var i = 0; i < filters.length; i++) {
            if (filters[i].value === value) {
                return filters[i];
            }
        }
        return null;
    }

    // Handle keyboard events within the dropdown
    $(element).on('keydown', '.dropdown-menu', function(e) {
        var dropdown = $(e.target).closest('.dropdown');
        var dropdownMenu = dropdown.find('.dropdown-menu');
        var dropdownToggle = dropdown.find('.dropdown-toggle');
        var clearButton = dropdownMenu.find('.clearBtn');
        var applyButton = dropdownMenu.find('.applyBtn');
        var currentFocus = $(document.activeElement);
        var isClickableElement = $(e.target).is('input, button, [role="checkbox"]') ||
            $(e.target).is('[tabindex="0"]');

        switch (e.keyCode) {
            case KEYS.TAB:
                // For tab navigation, exclude radio buttons
                var focusableElements = getAllInteractiveElements(dropdownMenu);
                e.preventDefault();
                handleAccessibilityInDropdown(focusableElements, currentFocus, e.shiftKey);
                break;

            case KEYS.DOWN: // Down arrow
            case KEYS.UP: // Up arrow
                if (!$(e.target).is('input[type="radio"]')) {
                    e.preventDefault();
                }
                break;

            case KEYS.ENTER:
            case KEYS.SPACE:
                // Only handle if on clickable element
                if (isClickableElement) {
                    if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
                        var $radio = angular.element(e.target);
                        var scope = $radio.scope();

                        scope.$apply(function() {
                            scope.fc.selected = $radio.val();
                            scope.c.onFilterValueChange(scope.fc, getFilterByValue(scope.fc.filters, $radio.val()));
                        });
                    } else {
                        e.preventDefault();
                        $(e.target).click();
                    }

                    // Special handling for clear button
                    if ($(e.target).is('.clearBtn')) {
                        // After clearing, move focus to the apply button if enabled otherwise move to last input if that is enabled
                        $timeout(function() {
                            if (!applyButton[0].disabled) {
                                applyButton.focus();
                            } else {
                                var lastInput = dropdownMenu.find('input:not(:disabled)').last();
                                if (lastInput.length) {
                                    lastInput.focus();
                                } else {
                                    // If no inputs are available, focus on apply button
                                    dropdownToggle.dropdown('toggle');
                                    dropdownToggle.focus();
                                }
                            }
                        }, 50);
                    }
                }
                break;

            case KEYS.ESCAPE:
                // Close dropdown and return focus to toggle
                e.preventDefault();
                dropdownToggle.dropdown('toggle');
                dropdownToggle.focus();
                handleDraftFilters();
                break;
        }
    });

    // Handle filter group expansion via keyboard
    $(element).on('keydown', '.fa-collapse-style', function(e) {
        switch (e.keyCode) {
            case KEYS.ENTER:
            case KEYS.SPACE:
                e.preventDefault();
                $(e.target).click();
                // Update dropdown height after expanding/collapsing
                updataActiveDropdownScrollHeight();
                break;
        }
    });

    controller.handleAccessibilityInFlyout = function(e) {
        var target = e.target;
        var shiftPressed = e.shiftKey;
        var closeButton = angular.element(document.getElementById('ec-flyout-close-btn'));
        var cancelButton = angular.element(document.getElementById('ec-flyout-cancel-btn'));
        var applyButton = angular.element(document.getElementById('ec-flyout-apply-btn'));

        // close modal on ESCAPE key press
        if (e.keyCode === KEYS.ESCAPE) {
            closeButton.click();
        }

        // Circular tabbing on the popup
        if (e.keyCode === KEYS.TAB) {
            if ($(target).is(closeButton)) {
                if (shiftPressed) {
                    if (!applyButton[0].disabled)
                        applyButton.focus();
                    else
                        cancelButton.focus();
                    e.preventDefault();
                }
                return true;
            } else if ($(target).is(cancelButton) && applyButton[0].disabled) {
                if (!shiftPressed) {
                    closeButton.focus();
                    e.preventDefault();
                }
            } else if ($(target).is(applyButton)) {
                if (!shiftPressed) {
                    closeButton.focus();
                    e.preventDefault();
                }
            }
            return false;
        }
        return true;
    };



    // make dropdowns stay when clicking on anything else apply button
    $(document).on('click', '.dropdown-menu', function(e) {
        var attrValue = e.target.getAttribute("data-filter-grp-apply");
        if (attrValue === 'filter-desktop-apply') {
            var focusElementId = e.target.getAttribute("data-filter-grp-apply-id");
            angular.element(document.getElementById("filter-" + focusElementId)).focus();
        } else {
            e.stopPropagation();
        }
    });


    // to manually trigger resize event for tooltip calculations
    $(document).on('click', '.dropdown-toggle', function(e) {
        if (!$(e.target).is('#all-filters')) {
            $('.sp-page-root').trigger('resize');
            updataActiveDropdownScrollHeight();
        }
    });

    $(document).on('click', 'span.fa-collapse-style', function(e) {
        updataActiveDropdownScrollHeight();
    });

    // function to know if drodown menu is overflown
    function updataActiveDropdownScrollHeight() {
        var dropdownModal = $('body').find('.dropdown.open .filter-container-style')[0];
        var isScrollable = false;
        if (dropdownModal && dropdownModal.clientHeight < dropdownModal.scrollHeight) {
            isScrollable = true;
        }
        scope.$apply(function() {
            controller.isScrollable = isScrollable;
        });
    }

    //on close of dropdown
    $(document).on('hide.bs.dropdown', '.filter-group', function(event) {
        var categoryId = event.relatedTarget.getAttribute('data-filter-grp-id');
        var category = controller.getCategory(categoryId);
        if (!category) return;

        function reconcileDraft() {
            if (category.selectedFilters.length == 0) {
                category.enableClearBtn = false;
            } else {
                category.enableClearBtn = true;
            }
            category.enableApplyBtn = false;
            controller.updateDraftFilters(category);
        }

        // Ensure Angular digest so the DOM reflects model changes
        scope.$applyAsync(reconcileDraft);
    });

    // on close/cancel of flyout modal
    $(document).on('hidden.bs.modal', '#ec-flyout-filter-modal', function() {
        handleDraftFilters();
    });

    // on close/cancel of mobile modal
    $(document).on('hide.bs.modal', '#ec-mobile-filter-modal', function() {
        handleDraftFilters();
    });

    // Fix modal-footer placement and hence keyboard navigation in mobile modal
    controller.$document.on('shown.bs.modal', '#ec-mobile-filter-modal', function() {
        var $modalContent = $('#ec-mobile-filter-modal .modal-content');
        var $modalFooter = $('#ec-mobile-filter-modal').find('.modal-footer.filter-footer-container');

        // Check if the modal footer is not inside the modal content
        if ($modalContent.length && $modalFooter.length && !$modalContent.find('.modal-footer.filter-footer-container').length) {
            // Move the footer back inside the content
            $modalContent.append($modalFooter);
        }
    });

    // indeterminate is a DOM property with no Angular binding, so sync the org tree's
    // partially selected checkboxes from the model on every digest. Returning the
    // state signature makes Angular re-run this once rows rendered mid-digest exist.
    var unwatchOrgTree = scope.$watch(function() {
        var tree = controller.orgTree;
        if (!tree) return '';
        var category = controller.getCategory(tree.categoryId);
        var inputs = element[0].querySelectorAll('.org-tree input[data-org-value]');
        var signature = '';
        for (var i = 0; i < inputs.length; i++) {
            var value = inputs[i].getAttribute('data-org-value');
            var node = tree.byValue[value];
            var filters = value === '__all__' ? (category && category.filters) : (node && node.subtree);
            var mixed = !!filters && controller.getOrgState(filters) === 'mixed';
            inputs[i].indeterminate = mixed;
            signature += mixed ? '1' : '0';
        }
        return signature;
    });
    scope.$on('$destroy', unwatchOrgTree);

    // handles draft filters for all categories
    function handleDraftFilters() {
        controller.enableApplyBtn = false;
        var selectedFilterCount = 0;
        controller.filtersData.forEach(function(category) {
            controller.updateDraftFilters(category);
            selectedFilterCount += category.selectedFilters.length;
        });
        if (selectedFilterCount === 0) {
            controller.enableClearBtn = false;
        } else {
            controller.enableClearBtn = true;
        }
    }

}