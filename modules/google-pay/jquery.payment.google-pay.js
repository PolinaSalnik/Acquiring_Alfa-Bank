/**
 * Usage:
 * add tag "<div id="SomeName"></div>"
 * call method $('#SomeName').paymentWayGooglePay();
 *
 * Example:
 * $('#GooglePayRow').paymentWayGooglePay({
 *    environment: 'TEST',
 *    gateway: 'bankName',
 *    merchantId: '01234567890123456789'
 *    currency: session.currency,
 *    rawAmount: session.rawAmount,
 *    merchantFullName: session.merchantInfo.merchantFullName,
 *    merchantUrl: session.merchantInfo.merchantUrl,
 *    merchantLogin: session.merchantInfo.merchantLogin,
 *    orderId: session.mdOrder
 * });
 *
 * Depends on:
 * - jQuery
 * - pay.js
 *
 * Links:
 * - Google brand guidelines:       https://developers.google.com/pay/api/web/guides/brand-guidelines
 * - Google integration checklist:  https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist
 * - Lib:                           https://pay.google.com/gp/p/js/pay.js
 */

(function($) {
  loadModules(['module-3d-secure']);
  var settings = {
    environment: 'PRODUCTION',  // Для тестового взаимодействия с Google значение должно быть задано как 'TEST', в ином случае: 'PRODUCTION'
    gateway: null,
    merchantId: null,
    merchantIdTest: '01234567890123456789',
    allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'], // РБС поддерживает
    allowedCardNetworks: ['MASTERCARD', 'VISA'], // Карточные сети поддерживаемые РБС
    libFile: '../../modules/google-pay/pay.js', // библиотека Google
    paymentWayGoogleAction: '../../google/paymentOrder.do',
    language: 'ru',
    buttonId: 'rbsGooglePay', // btnGooglePayment
    messageError: {
      'ru': 'Сервис Google Pay временно недоступен. Попробуйте позднее.',
      'en': 'Service Google Pay is temporarily unavailable. Try again later.'
    },
    currency: null,
    rawAmount: null,  // 517.42
    merchantFullName: null,
    merchantUrl: null,
    merchantLogin: null,
    orderId: null,
    buttonType: 'short',    // "short", "long"
    buttonColor: 'default', // "default", "black", "white"
    phoneRequired: false,   // указывается, если включена фискализация и не был передан ни номер телефона ни email при регистрации заказа
    emailRequired: false    // указывается, если включена фискализация и не был передан ни номер телефона ни email при регистрации заказа
  };

  var methods = {
    init: function(options) {
      var elem = $(this);

      if (options) {
        $.extend(settings, options);
      }

      // Провера наличия елемента для загрузки кнопки Google Pay
      if (!$(this).length) {
        console.warn('No item to load Google Pay button on page.');
        return false;
      }

      // загрузка библиотеки Google
      $.ajaxSetup({cache: true});
      $.getScript(settings.libFile)
      .done(function() {
        var paymentsClient = methods.getGooglePaymentsClient();

        // Проверка возможности отображения кнопки оплаты посредством GooglePay. Если проверка пройдена,
        // добавляем на страницу кнопку, вешаем на нее событие и предварительно
        // загружаем платежные данные
        paymentsClient.isReadyToPay({allowedPaymentMethods: settings.allowedPaymentMethods})
        .then(function(response) {
          if (response.result) {
            methods.showGooglePayButton(elem);
            methods.prefetchGooglePaymentData();
          }
        })
        .catch(function(err) {
          console.warn('Can\'t load Google Pay button: ' + err);
          console.warn('Button Google Pay output canceled.');
        });
      })
      .fail(function() {
        // Если не удалось загрузить библиотеку Google, дальнейшая загрузка Google Pay невозможна
        console.warn('Can\'t load file ' + settings.libFile);
        console.warn('Button Google Pay output canceled.');
        return false;
      });
    },

    // Инициализация клиента Google Pay API с указанием окружения
    getGooglePaymentsClient: function() {
      return (new google.payments.api.PaymentsClient({environment: settings.environment}));
    },

    // Загружаем в статику кнопку Google Pay
    showGooglePayButton: function(elem) {
      var button = this.getGooglePaymentsClient().createButton({
        onClick: this.onGooglePaymentButtonClicked,
        buttonType: settings.buttonType,
        buttonColor: settings.buttonColor
      });
      elem.append(button);
      elem.find('button').attr("id", settings.buttonId);
      elem.show();
    },

    // Настроить вызов Google Pay API и получить поля PaymentDataRequest
    getGooglePaymentDataConfiguration: function() {
      return {
        merchantId: settings.environment === 'TEST' ? settings.merchantIdTest : settings.merchantId,
        merchantInfo: {
          merchantName: settings.merchantFullName,
          merchantOrigin: settings.merchantUrl
        },
        paymentMethodTokenizationParameters: {
          tokenizationType: 'PAYMENT_GATEWAY',
          parameters: {
            'gateway': settings.gateway,
            'gatewayMerchantId': settings.merchantLogin
          }
        },
        allowedPaymentMethods: settings.allowedPaymentMethods,
        cardRequirements: {
          allowedCardNetworks: settings.allowedCardNetworks,
          billingAddressRequired: settings.phoneRequired,
          billingAddressFormat: 'MIN'
        },
        phoneNumberRequired: settings.phoneRequired,
        emailRequired: settings.emailRequired
      };
    },

    // Передать в Google Pay API сумму валюту и описание статуса суммы (итого или еще нет)
    // Получим транзакционную информацию для использования в PaymentDataRequest
    getGoogleTransactionInfo: function() {
      return {
        currencyCode: settings.currency,
        totalPriceStatus: 'FINAL',
        totalPrice: settings.rawAmount
      };
    },

    // Предварительная загрузка платежных данных для увеличения производительности
    prefetchGooglePaymentData: function() {
      var paymentDataRequest = methods.getGooglePaymentDataConfiguration(),
          paymentsClient     = methods.getGooglePaymentsClient();
      paymentDataRequest.transactionInfo = methods.getGoogleTransactionInfo();
      paymentsClient.prefetchPaymentData(paymentDataRequest);
    },

    // Отображение окна выбора Google Pay после нажатия кнопки
    onGooglePaymentButtonClicked: function() {
      var paymentDataRequest = methods.getGooglePaymentDataConfiguration(),
          paymentsClient     = methods.getGooglePaymentsClient();
      paymentDataRequest.transactionInfo = methods.getGoogleTransactionInfo();
      paymentsClient.loadPaymentData(paymentDataRequest)
      .then(function(paymentData) {
        methods.sendGooglePayment(paymentData);
      })
      .catch(function(err) {
        methods.loadFromPayment('showError', settings.messageError[settings.language]);
        console.warn(err.statusMessage);
      });
    },

    // отправка данных
    sendGooglePayment: function(paymentData) {
      methods.loadFromPayment('showProgress');
      var token = window.btoa(unescape(encodeURIComponent(paymentData.paymentMethodToken.token))),
          data  = {
            paymentToken: token,
            mdOrder: settings.orderId,
            additionalParameters: {}
          };

      if ('email' in paymentData && paymentData.email !== '') {
        data.additionalParameters.email = paymentData.email;
      }
      if ('billingAddress' in paymentData.cardInfo && paymentData.cardInfo.billingAddress.phoneNumber !== '') {
        data.additionalParameters.phone = paymentData.cardInfo.billingAddress.phoneNumber;
      }

      $.ajax({
        url: settings.paymentWayGoogleAction,
        type: 'POST',
        cache: false,
        contentType: 'application/json',
        data: JSON.stringify(data),
        dataType: 'json',
        error: function() {
          methods.loadFromPayment('hideProgress');
          methods.loadFromPayment('showError', settings.messageError[settings.language]);
          console.warn('Can\'t loading google action method.');
          return true;
        },
        success: function(data) {
          methods.loadFromPayment('hideProgress');

          if (data.success) {
            var data = data.data;
            if ('acsUrl' in data && data['acsUrl'] !== null) {
              $(this).module3DSecure('setNewSettings', {'orderId': settings.orderId});
              $(this).module3DSecure('checkRedirectToAcs', data);
            } else if ('error' in data) {
              methods.loadFromPayment('showError', data.error.message);
            } else if ('redirect' in data) {
              methods.loadFromPayment('redirect', data.redirect);
            } else if ('redirectUrl' in data) {
              methods.loadFromPayment('redirect', data.redirectUrl);
            }
            return true;
          } else {
            if ('redirectUrl' in data.data) {
              methods.loadFromPayment('redirect', data.data.redirectUrl);
              console.warn('Error in transaction'
                + '. Code: ' + data.error.code
                + '. Message: ' + data.error.message
                + '. Description: ' + data.error.description);
            }
            methods.loadFromPayment('showError', data.error.message);
          }
        }
      });
    },

    loadFromPayment: function(methodName, settings) {
      try {
        $.fn.payment(methodName);
      } catch (e) {
        console.warn('Can\'t loading method ' + methodName + ' from payment.');
        return false;
      }
      $.fn.payment(methodName, settings !== 'undefined' ? settings : '');
    }
  };

  $.fn.paymentWayGooglePay = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.paymentWayGooglePay');
    }
  };
})(jQuery);

/**
 * Проверка подключения модулей/функций к статике
 */
function loadModules(arr) {
  if (typeof moduleLoader !== 'object') {
    // Проверка подключения moduleLoader
    $.ajax({
      url: '../../modules/module-loader/jquery.module-loader.js',
      async: false,
      dataType: "script",
      success: function() {
        console.warn('moduleLoader is connected.');
      },
      error: function() {
        console.warn('Failed to load moduleLoader.');
      }
    });
  }
  if (Array.isArray(arr)) {
    moduleLoader.connectionCheck(arr);
    return true;
  } else {
    return false;
  }
}
