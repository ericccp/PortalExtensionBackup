(function() {
    data.cardData = options;
    data.title = data.cardData.title;
    data.serialNumber = data.cardData.serialNumber ? data.cardData.serialNumber : "";
    data.assetTag = data.cardData.assetTag;
    data.model = data.cardData.model;
    data.model_category = data.cardData.model_category;
    data.isSoftware = data.model_category === 'Software';
    data.software = data.cardData.software || {};
    data.manufacturer = data.cardData.manufacturer;

    // For software, drop a leading manufacturer/vendor name from the product
    // title when it duplicates the vendor shown on the line below
    // (e.g. "Adobe Systems Acrobat DC Standard" -> "Acrobat DC Standard").
    data.softwareDisplayTitle = data.title || data.model;
    if (data.isSoftware && data.manufacturer && data.softwareDisplayTitle) {
        var vendor = data.manufacturer.trim();
        var productTitle = data.softwareDisplayTitle.trim();
        if (vendor && productTitle.length > vendor.length &&
            productTitle.substring(0, vendor.length).toLowerCase() === vendor.toLowerCase() &&
            /\s/.test(productTitle.charAt(vendor.length))) {
            var trimmed = productTitle.substring(vendor.length).replace(/^[\s\-–—:]+/, '');
            // Only trim when the remaining title still has 2+ words, so short
            // names like "LogRhythm Cloud" keep their vendor for context.
            if (trimmed && trimmed.split(/\s+/).length >= 2) {
                data.softwareDisplayTitle = trimmed;
            }
        }
    }
    data.unit_cost = data.cardData.unit_cost;
    data.status = data.cardData.status;
    data.subcaption = data.cardData.subcaption;
    data.url = data.cardData.url;
    data.sysID = data.cardData.sysID;
    data.asset_function = data.cardData.asset_function;
    data.assigned_to = data.cardData.assigned_to;
    data.assigned_to_sys_id = data.cardData.assigned_to_sys_id;
    data.reserved_for = data.cardData.reserved_for;
    data.reserved_for_sys_id = data.cardData.reserved_for_sys_id;
    data.location = data.cardData.location;
    data.cost_center = data.cardData.cost_center;
    data.actionConfig = data.cardData.actionConfig;
    data.get_help_url = "?id=sc_cat_item&sys_id=e85a62ab93e4121055431cbf6489183b&asset_sys_id=" + data.cardData.sysID;

    var assetUtil = new global.AssetWidgetUtilsExtension();
    data.supportedColors = assetUtil.getLabelColorBackground() || {};
    data.supportedIcons = assetUtil.getHardwareModelIcon() || {};

    // Receiving asset popup details
    // var receivePopUpDetails = JSON.parse(sn_itam_common.AssetReceivingUtils.getReceiveAssetPopUpDetails());
    // Object.assign(data, receivePopUpDetails);
    
    // // Override messages from the original AssetReceivingUtils script include
    // var overridePopUpMessages = {
    //     "modelTooltip": 'Model of the asset received.',
    //     "assetTagTooltip": 'Asset tag received.',
    //     "raiseIssueMessage": "If the asset record doesn't match the details, ask for help.",
    //     "raiseIssueButtonTooltip": "Get help with an asset issue"
    // };
    // Object.assign(data, overridePopUpMessages);

    if (input && input.action == "updateAsset") {
        var params = {};
        params.sysId = input.sysID;
        params.type = input.type;
        if (input.type == sn_itam_common.AssetReceivingUtils.HARDWARE_TYPE) {
            if (!gs.nil(input.assetTag)) {
                params.assetTag = GlideSecurityUtils.escapeScript(input.assetTag);
            }
            else {
                params.assetTag = "";
            }
            if (!gs.nil(input.serialNumber)) {
                params.serialNumber = GlideSecurityUtils.escapeScript(input.serialNumber);
            }
            else {
                params.serialNumber = "";
            }
            params.isAssetTagUpdated = input.isAssetTagUpdated;
            params.isSerialNumberUpdated = input.isSerialNumberUpdated;
        } else {
            params.quantity = input.quantity;
        }
        data.isAssetValid = sn_itam_common.AssetReceivingUtils.validateAndUpdateAsset(params);
    }

})();
