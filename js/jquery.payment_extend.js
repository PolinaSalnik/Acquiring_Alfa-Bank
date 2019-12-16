/**
 * Модуль для декарации библиотеки jquery.payment
 * Делает запрос на сервер для получения дополнительных параметров
 * проведения платежа перед вызовом оригинального метода onReady.
 */
(function () {
  if (!$.fn.payment) {
    throw new Error('Подключение библиотеки jquery.payment_extend должно производиться после подключения jquery.payment')
  }

  var originalPayment = $.fn.payment;
  var emptyFunction = function () {
  };

  $.fn.payment = function (method) {
    var self = this;

    if (typeof method === 'object') {
      var originalOnReady = method.onReady || emptyFunction;

      method.onReady = function (session) {
        var onReadyArguments = Array.prototype.slice.call(arguments);

        // Если дополнительные параметры не были получены ранее
        if (!session.paymentSettings) {
          // Не зависимо от результата запроса - в paymentSettings всегда должен быть объект
          session.paymentSettings = {};

          // Получение дополнительной параметров для проведения платежа
          $.getJSON('../../rest/getPaymentSettings.do?login=' + encodeURI(session.merchantInfo.merchantLogin))
            .done(function (paymentSettingsData) {
              // Добавляем полученные данные к оригинальному объекту сессии
              session.paymentSettings = paymentSettingsData.settings;
            })
            .always(function(){
              // Вызываем оригинальный метод onReady
              originalOnReady.apply(self, onReadyArguments)
            });
        } else {
          originalOnReady.apply(self, onReadyArguments)
        }
      };
    }

    originalPayment.apply(self, Array.prototype.slice.call(arguments));
  }
})();
