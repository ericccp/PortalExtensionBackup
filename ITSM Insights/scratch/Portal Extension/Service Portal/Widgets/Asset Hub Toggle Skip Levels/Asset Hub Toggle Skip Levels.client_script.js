api.controller = function($rootScope, $sce) {
    var c = this;
    c.isMobile = window.innerWidth <= 767;
    var displaySkipLevels = !!c.data.includeSkipLevels;

    setDisplaySkipLevelToggleValue = function() {
        displaySkipLevels = !displaySkipLevels;
        // Received by EC Asset Tabs, which reloads the Devices tab with the
        // expanded (or direct-reports-only) manager audience.
        $rootScope.$emit('sn_ex_sp.toggleSkipLevels', {
            tabId: c.data.tabId,
            includeSkipLevels: displaySkipLevels
        });
        c.updateToggleElement();
    };

    // The popover is built as an HTML string, so translated text must be escaped
    function escapeHtml(text) {
        return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    c.updateToggleElement = function() {
        var disabled = !c.data.hasSkipLevels;
        var tooltip = escapeHtml(c.data.skipLevelsTooltip);
        var tooltipAttributes = 'data-toggle="tooltip" data-placement="bottom" data-container="body" title="' + escapeHtml(c.data.disabledToggleMessage) + '" ';
        c.htmlPopover = $sce.trustAsHtml('<div class="input-switch" data-toggle="tooltip" data-placement="bottom" data-container="body" title="' + tooltip + '"><input type="checkbox" aria-describedby="toggle-skip-level-hint" ' + (disabled ? "disabled" : "") + ' onclick="setDisplaySkipLevelToggleValue()" ' + (displaySkipLevels ? 'checked' : '') + ' name="toggle-skip-level" id="toggle-skip-level" aria-label="' + c.data.displaySkipLevelsLabel + '" role="checkbox"/><label class="switch" for="toggle-skip-level" role="presentation" aria-hidden="true"><span class="sr-only">' + c.data.displaySkipLevelsLabel + '</span></label><span class="sr-only" id="toggle-skip-level-hint">' + tooltip + '</span></div><p ' + (disabled ? tooltipAttributes : "") + 'class="toggle-skip-level-label ' + (disabled ? "text-muted" : "") + '">' + c.data.displaySkipLevelsLabel + '</p>');
    };

    c.updateToggleElement();
};
