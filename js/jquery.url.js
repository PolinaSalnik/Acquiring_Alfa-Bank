/*
jQuery Url Plugin
	* RBS
	* Version 1.2
	* 04.03.2019 18:00
*/
(function($) {
  $.url = {};
  $.extend($.url, {
    _params: {},
    init: function() {
      var paramsRaw = "";
      try {
        paramsRaw =
          (document.location.href.split("?", 2)[1] || "").split("#")[0].split("&") || [];
        for (var i = 0; i < paramsRaw.length; i++) {
          var pair = paramsRaw[i].split("=");
          // If first entry with this name
          if (typeof this._params[pair[0]] === "undefined") {
            // if cyrrilic unicode (%u042D/%u0414)
            if (/\%u/i.test(pair[1])) {
              this._params[pair[0]] = unescape(pair[1]);
            } else {
              this._params[pair[0]] = decodeURIComponent(pair[1]);
            }
            // If second entry with this name
          } else if (typeof this._params[pair[0]] === "string") {
            var arr = [this._params[pair[0]], decodeURIComponent(pair[1])];
            this._params[pair[0]] = arr;
            // If third or later entry with this name
          } else {
            this._params[pair[0]].push(decodeURIComponent(pair[1]));
          }
        }
      }
      catch (e) {
        alert(e);
      }
    },
    param: function(name) {
      return this._params[name] || "";
    },
    paramAll: function() {
      return this._params;
    }
  });
  $.url.init();
})(jQuery);