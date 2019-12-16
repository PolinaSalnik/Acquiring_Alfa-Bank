var payUserAgent = function () {
    return {
        isAndroid: function () {
            return navigator.userAgent.match(/Android/i);
        },
        isBlackBerry: function () {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        isIOS: function () {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        isOpera: function () {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        isWindows: function () {
            return navigator.userAgent.match(/Windows Phone|iemobile|WPDesktop/i);
        },
        isMobileDevice: function () {
            return (this.isAndroid() || this.isBlackBerry() || this.isIOS() || this.isOpera() || this.isWindows());
        }
    }
}();
