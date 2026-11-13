(function() {

    data.assetData = options.assetData || options.requestData || [];

    data.isDraftTab = options.isDraftTab || false;
    data.isSoftwareTab = options.isSoftwareTab || false;
    data.deviceColumnLabel = data.isSoftwareTab ? gs.getMessage("Product name") : gs.getMessage("Device");

    data.supportedColors = new global.AssetWidgetUtilsExtension().getLabelColorBackground() || {};
    data.draftDeleteEventName = options.draftDeleteEventName || '';
    data.assets = [];
    data.hasActions = false;

    data.assetData.forEach(function(item) {
        var assetItem = {
            title: data.isDraftTab ? item.cartItemName :
                (item.model_category === 'Software' ? trimVendorPrefix(item.title, item.manufacturer) : item.title),
            description: getDescription(item),
            url: item.url || item.urlParams,
            timestamp: item.timestamp,
            status: data.isDraftTab ? gs.getMessage("Draft") : item.install_status,
            sysID: item.sysID,
            model: item.model,
            assigned_to: item.assigned_to,
            reserved_for: item.reserved_for,
            cost_center: item.cost_center,
            location: item.location,
            unit_cost: item.unit_cost,
            subscriptionPeriod: item.software && item.software.subscriptionPeriod
        };

        assetItem.actionConfig = item.actionConfig || [];
        assetItem.cardData = item;
        if (data.isDraftTab) {
            assetItem.actionConfig = data.draftDeleteEventName ? [{
                label: gs.getMessage("Delete"),
                eventName: data.draftDeleteEventName,
                eventPayload: item.sysID
            }] : [];
        }
        data.hasActions = data.hasActions || assetItem.actionConfig.length > 0;

        data.assets.push(assetItem);
    });

    // var hasReceiveAction = data.assets.some(function(asset) {
    //     return asset.actionConfig.some(function(action) {
    //         return action.type === 'receive';
    //     });
    // });
    // if (hasReceiveAction) {
    //     var receivePopUpDetails = JSON.parse(sn_itam_common.AssetReceivingUtils.getReceiveAssetPopUpDetails());
    //     Object.keys(receivePopUpDetails).forEach(function(key) {
    //         data[key] = receivePopUpDetails[key];
    //     });
    //     data.hardwareType = sn_itam_common.AssetReceivingUtils.HARDWARE_TYPE;
    // }

    if (input && input.action == "updateAsset") {
        var params = {};
        params.sysId = input.sysId;
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


    // Drop a leading manufacturer/vendor name from a software product title when
    // it duplicates the vendor shown in the row's secondary line
    // (e.g. "Adobe Systems Acrobat DC Standard" -> "Acrobat DC Standard").
    // Only trims when 2+ words remain, so short names keep their vendor.
    function trimVendorPrefix(title, manufacturer) {
        if (!title || !manufacturer) {
            return title;
        }
        var vendor = String(manufacturer).trim();
        var productTitle = String(title).trim();
        if (vendor && productTitle.length > vendor.length &&
            productTitle.substring(0, vendor.length).toLowerCase() === vendor.toLowerCase() &&
            /\s/.test(productTitle.charAt(vendor.length))) {
            var trimmed = productTitle.substring(vendor.length).replace(/^[\s\-–—:]+/, '');
            if (trimmed && trimmed.split(/\s+/).length >= 2) {
                return trimmed;
            }
        }
        return title;
    }

    function getDescription(item) {
        if (data.isDraftTab) {
            return [item.itemName];
        }

        // add in different paths for hardware and software assets
        var description = [];
        if (item.model) {
            description.push(item.model);
        }
        if (item.manufacturer) {
            description.push(item.manufacturer);
        }
        if (item.model_category) {
            description.push(item.model_category);
        }
        return description;
    }
})();
