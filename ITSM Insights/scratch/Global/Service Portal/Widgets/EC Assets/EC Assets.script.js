(function() {
    var assetUtil = new global.AssetWidgetUtilsExtension();
    var isManager = assetUtil.isManager() || assetUtil.isCostCenterManager();

    if (isManager) {
        data.assetsHeader = gs.getMessage("My Team's IT Assets");
        data.panelSubtitle = gs.getMessage("View your team's devices and software licenses");
    } else {
        data.assetsHeader = gs.getMessage(options.header_title);
        data.panelSubtitle = gs.getMessage("Devices and software licenses assigned to you");
    }

	data.panelActionTitle = gs.getMessage("Contact us");
    var widgetLimitOptions = {};
    widgetLimitOptions.limit = options.limit;
    data.actionUrl = "?id=sc_cat_item&sys_id=7bba78e83bf33250b62513aaa4e45a3e";
    data.widget = $sp.getWidget('ec-asset-tabs', widgetLimitOptions);
})();