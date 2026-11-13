api.controller = function($scope, $timeout, $uibModal, spUtil, $window) {
    /*
     * Events being $broadcast:
     *   None.
     *
     * Events being $emit:
     *   action.eventName (dynamic) - handleActionClick emits the selected action's eventPayload.
     *
     * Events being spied $on:
     *   None.
     */

    var c = this;

    $scope.getLabelBackground = function(status) {
        if (!status) {
            return 'label-info-color';
        }

        var lowerCased = status.toLowerCase();
        var titleCase = lowerCased.charAt(0).toUpperCase() + lowerCased.slice(1);
        return c.data.supportedColors[titleCase] || 'label-info-color';
    };

    c.navigateToRequest = function(url, event) {
        if (event.target !== event.currentTarget && event.type === 'keydown') return;
        if (event.type === 'click' || (event.type === 'keydown' && event.keyCode === 13)) {
            event.preventDefault();
            $window.location.href = url;
        }
    };

    c.redirect = function(url) {
        if (url) $window.location.href = url;
    };

    c.handleActionClick = function(asset, action, event) {
        event.preventDefault();
        event.stopPropagation();
        if (action.disabled === true) return;
        if (action.type === 'receive') {
            c.data.get_help_url = "?id=sc_cat_item&sys_id=e85a62ab93e4121055431cbf6489183b&asset_sys_id=" + asset.sysID;
            c.openReceivePopup(asset.cardData);
        } else if (action.eventName) {
            $scope.$emit(action.eventName, action.eventPayload);
        } else {
            c.redirect(action.url);
        }
    };

    c.RECEIVE_TEMPLATE = "ec-receive-template";

    c.openReceivePopup = function(asset) {
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
                    c.data.sysId = asset.sysID;
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

};
