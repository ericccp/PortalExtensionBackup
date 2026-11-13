(function() {
    data.deviceDetails = {
        notifications: []
    };

    var assetSysId = options.asset_sys_id || $sp.getParameter('sys_id');

    if (gs.nil(assetSysId)) {
        return;
    }

    var util = new x_1026751_portal_0.DeviceRegistrationUtil();
    var deviceDetails = util.getDeviceDetails(assetSysId);

    if (deviceDetails && deviceDetails.success) {
        data.deviceDetails.notifications = deviceDetails.notifications || [];
    }
})();
