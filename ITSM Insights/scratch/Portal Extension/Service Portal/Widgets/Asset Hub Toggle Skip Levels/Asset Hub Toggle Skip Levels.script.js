(function() {
    data.configurationLabel = gs.getMessage('Settings');
    data.displaySkipLevelsLabel = gs.getMessage('Show skip level reports');
    data.disabledToggleMessage = gs.getMessage('This setting option is unavailable for the current view');
    data.hasSkipLevels = (input && input.hasSkipLevels) || (options && options.hasSkipLevels);
    data.tabId = (input && input.tabId) || (options && options.tabId);
    data.skipLevelsTooltip = data.tabId == 'software' ?
        gs.getMessage('Also show software licenses for people who report to your direct reports.') :
        gs.getMessage('Also show devices for people who report to your direct reports.');
    data.includeSkipLevels = !!((input && input.includeSkipLevels) || (options && options.includeSkipLevels));
    data.isOnNowMobileApp = $sp.getParameter("view") === 'mobile';
})();