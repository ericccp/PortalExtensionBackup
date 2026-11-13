api.controller = function($scope, $timeout, $uibModal, spUtil, $window) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   c.data.actionConfig.eventName (dynamic) - handleAction emits the configured event with c.data.actionConfig.eventPayload when invoked.
     *
     * Events being spied $on:
     *   None.
     */
    /* widget controller */
    var c = this;

    c.redirect = function(url) {
        $window.location.href = url;
    };
    
    // revisit if we want to capture analytics on portal
	// i18n, snAnalytics - add services to controller declaration above
    // c.createAppseeEvent = function() {
    //     var payload = {};
    //     payload.name = "Click on asset receive action";
    //     payload.data = {};
    //     snAnalytics.addEvent(payload);
    // };

    c.RECEIVE_TEMPLATE = "ec-receive-template";

    c.openReceivePopup = function(asset) {
        // if (action.disabled) {
        //     return;
        // }
        
        c.modalInstance = $uibModal.open({
            scope: $scope,
            templateUrl: c.RECEIVE_TEMPLATE,
            controller: function($scope, $uibModalInstance, $timeout) {

                // Using $timeout to ensure the DOM has been rendered
                c.redirect = function(url) {
                    $window.location.href = url;
                };

                $timeout(function() {
                    var modalDialog = document.querySelector('.modal-dialog');
                    if (modalDialog) {
                        modalDialog.style.display = 'flex';
                        modalDialog.style.alignItems = 'center';
                        modalDialog.style.justifyContent = 'center';
                        modalDialog.style.height = '100%';
                        modalDialog.style.maxWidth = '383px';
                    }
                    var modalContent = document.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.width = '100%';
                        modalContent.style.maxHeight = "calc(100vh - 40px)";
                        modalContent.style.overflowY = "auto";
                    }
                }, 0);

                // Receiving asset popup details
                $scope.asset = asset;
                c.data.fieldErrorMessage = "";
                c.data.errorField = "";

                if (asset.type == c.data.hardwareType) {
                    c.data.assetTag = asset.assetTag;
                    c.data.serialNumber = asset.serialNumber;
                } else {
                    c.data.quantity = asset.quantity;
                }
                $scope.cancel = function() {
                    $uibModalInstance.dismiss('cancel');
                };
                $scope.raiseIssue = function() {
                    c.redirect(c.data.get_help_url);
                };
                $scope.submit = function() {
                    c.data.type = asset.type;
                    c.data.sysId = asset.id;
                    c.data.isAssetTagUpdated = false;
                    c.data.isSerialNumberUpdated = false;
                    if (c.data.type == c.data.hardwareType) {
                        if (c.data.assetTag && c.data.assetTag != asset.assetTag) {
                            c.data.isAssetTagUpdated = true;
                        }
                        if (c.data.serialNumber && c.data.serialNumber != asset.serialNumber) {
                            c.data.isSerialNumberUpdated = true;
                        }
                    }
                    c.data.action = "updateAsset";
                    c.server.update().then(function(response) {
                        if (response.isAssetValid.isValid) {
                            // c.createAppseeEvent();
                            if (asset.type == c.data.hardwareType) {
                                asset.receive = false;
                                asset.name = response.isAssetValid.assetDetails.name;
                                asset.status = response.isAssetValid.assetDetails.status;
                            } else {
                                // For consumables, fetch the assets again since various scenarios like splits or merges may occur. Updating a single asset won't be sufficient.
                                c.data.action = "fetchAssets";
                                c.server.update().then(function(_) {});
                            }
                            $uibModalInstance.close();
                            spUtil.addInfoMessage('<span><i class="fa fa-info-circle" style="margin-right: 20px;"></i>' + ' ' + response.isAssetValid.successMessage + '</span>');

                            // wait 1 second, then refresh the page
                            $timeout(function() {
                                $window.location.reload();
                            }, 1000);


                        } else {
                            c.data.fieldErrorMessage = response.isAssetValid.error.message;
                            c.data.errorField = response.isAssetValid.error.field;
                        }
                    });
                };
            }
        });
    };

    $scope.getLabelBackground = function(status) {
        var lowerCased = status.toLowerCase();
        var titleCase = lowerCased.charAt(0).toUpperCase() + lowerCased.slice(1);
        return c.data.supportedColors[titleCase] || 'label-info-color';
    };

    $scope.getCardIcon = function(model_category) {
        return c.data.supportedIcons[model_category] || 'fa-question-circle';
    };

    c.navigateOnKeyEnter = function(event) {
        if (event.keyCode === 13) {
            $timeout(function() {
                event.preventDefault();
                event.stopPropagation();
                event.target.click();
            });
        }
    };

    // no actions being used at this time
    $scope.handleAction = function(event) {
        event.preventDefault();
        event.stopPropagation();
        $scope.$emit(c.data.actionConfig.eventName, c.data.actionConfig.eventPayload);
    };
    
};