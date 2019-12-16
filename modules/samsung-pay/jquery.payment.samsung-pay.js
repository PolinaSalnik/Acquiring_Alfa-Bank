/**
 * Usage:
 * add tag "<div id="SomeName"></div>"
 * call method $('#SomeName').paymentWaySamsungPay();
 *
 * Example:
 * $('#SamsungPayRow').paymentWaySamsungPay({
 *    orderId: session.mdOrder,
 *    language: 'en',
 *    buttonColor: 'white'
 * });
 *
 * Depends on:
 * - jQuery
 * - pc_gsmpi_web_sdk.js
 *
 * Links:
 * - Samsung Pay Identity Guidelines: https://pay.Samsung.com/developers/resource/brand
 * - Service integration guide:       https://pay.Samsung.com/developers/resource/guide
 */

(function($) {
  var settings = {
    libFile: '../../modules/samsung-pay/pc_gsmpi_web_sdk.js',  // библиотека Samsung
    paymentWaySamsungAction: '../../samsungWeb/payment.do',
    language: 'ru',
    buttonId: 'rbsSamsungPay',
    buttonColor: 'black',
    defaultStyle: true,
    orderId: null,
    currentPage: window.location.href,
    messageError: {
      'ru': 'Сервис Samsung Pay временно недоступен. Попробуйте позднее.',
      'en': 'Service Samsung Pay is temporarily unavailable. Try again later.'
    },
    buttonImage: {
      'black': '../../modules/samsung-pay/img/samsung-pay_white.svg',
      'white': '../../modules/samsung-pay/img/samsung-pay_black.svg'
    }
  };

  var methods = {
    init: function(options) {
      var elem = $(this);
      if (options) {
        $.extend(settings, options);
      }

      // Провера наличия елемента для загрузки кнопки Samsung Pay
      if (!$(this).length) {
        console.warn('No item to load Samsung Pay button on page.');
        return false;
      }

      // Загрузка библиотеки Samsung
      $.ajaxSetup({cache: true});
      $.getScript(settings.libFile)
      .done(function() {
        // добавляем на страницу кнопку, загружаем для нее стили и вешаем на нее события.
        methods.showSamsungPayButton(elem);
        methods.loadCss(elem);
        methods.binding(elem);
      })
      .fail(function() {
        // Если не удалось загрузить библиотеку Google, дальнейшая загрузка Google Pay невозможна
        console.warn('Can\'t load file ' + settings.libFile);
        console.warn('Button Samsung Pay output canceled.');
        return false;
      });
    },

    // Загружаем в статику кнопку Samsung Pay
    showSamsungPayButton: function(elem) {
      elem.show().append('<button id="' + settings.buttonId + '" type="button" lang="' + settings.language + '" title="Samsung Pay"></button>');
    },

    // Добавление событий на кнопку
    binding: function(elem) {
      elem.on('click', '#' + settings.buttonId, methods.SamsungAction);
    },

    // Загрузка дефолтовых стилей для кнопки
    loadCss: function(elem) {
      elem.find('#' + settings.buttonId).css({
        'background-image': 'url(' + settings.buttonImage[settings.buttonColor] + ')'
      });
      if (settings.defaultStyle) {
        elem.find('#' + settings.buttonId).css({
          'background-size': '80% 60%',
          'background-position': 'center',
          'background-repeat': 'no-repeat',
          'background-color': settings.buttonColor,
          'width': '220px',
          'height': '50px',
          'border': 'none',
          'border-radius': '5px',
          'cursor': 'pointer',
          'outline': '0'
        });
      }
    },

    // Метод для вызова методов из плагина payment
    loadFromPayment: function(methodName, settings) {
      try {
        $.fn.payment(methodName);
      } catch (e) {
        console.warn('Can\'t loading method ' + methodName + ' from payment.');
        return false;
      }
      $.fn.payment(methodName, settings !== 'undefined' ? settings : '');
    },

    // отправка данных
    SamsungAction: function() {
      methods.loadFromPayment('showProgress');
      $.ajax({
        type: 'POST',
        url: settings.paymentWaySamsungAction,
        data: {
          mdOrder: settings.orderId,
          onFailedPaymentBackUrl: settings.currentPage
        },
        error: function() {
          methods.loadFromPayment('hideProgress');
          methods.loadFromPayment('showError', settings.messageError[settings.language]);
          console.warn('Can\'t loading method payment.do');
        }
      }).done(function(responseStr) {
        methods.loadFromPayment('hideProgress');
        try {
          var response = JSON.parse(responseStr);
        } catch (e) {
          $.fn.payment('showError', settings.messageError[settings.language]);
          console.warn('Method payment.do did\'t return JSON');
          return false;
        }

        if (response.successful) {
          SamsungPay.connect(
            response.transactionId,
            response.href,
            response.serviceId,
            response.callbackUrl,
            response.cancelUrl,
            response.countryCode,
            response.mod,
            response.exp,
            response.keyId);
        } else {
          methods.loadFromPayment('showError', settings.messageError[settings.language]);
          console.warn('Can\'t loading method payment.do');
        }
      });
    }
  };

  $.fn.paymentWaySamsungPay = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.paymentWaySamsungPay');
    }
  };
})(jQuery);
