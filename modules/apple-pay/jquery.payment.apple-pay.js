/**
 * Usage:
 * add tag "<div id="SomeName"></div>"
 * call method $('#SomeName').applePay();
 *
 * Example:
 * $('#ApplePayRow').applePay({
     paymentData: {
       mdOrder: session.mdOrder,
       currencyCode: session.currency,
       amount: session.rawAmount,
       label: 'Оплата в М.Видео'
     }
 * });
 *
 * Depends on:
 * - jQuery
 * - payment.user-agent.js
 */

(function($) {
  var settings = {
    paymentData: {
      mdOrder: '',
      countryCode: 'RU',
      currencyCode: 'RUR', // RUR - 810, RUB - 643
      supportedNetworks: ['masterCard', 'visa'],
      merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
      amount: 0,
      label: '',
      addParams: {}
    },

    paymentType: 'buy',  // Может быть 'plain', 'buy', 'set-up', 'donate'
    buttonStyle: 'unset', // Одно из: 'unset', 'black', 'white', 'white-outline'
    language: 'ru',

    // Расширенные настройки
    contextLevel: '../../'
  };


  // Public methods
  var methods = {
    init: function(options) {
      if (options) {
        $.extend(true, settings, options);
      }

      return this.each(function() {
        $(this).ready(_methods.renderButton.bind(this));
      });
    }
  };

  // Private methods
  var _methods = {
    renderButton: function() {
      $this = $(this);
      // Если сафари и разрешена оплата через Apple Pay
      if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
        $this.append(' \
          <button lang="' + settings.language + '" \
                  id="rbs-apple-button" \
                  type="button" \
                  style="-webkit-appearance: -apple-pay-button; \
                         -apple-pay-button-type:' + settings.paymentType + ';\
                         -apple-pay-button-style:' + settings.buttonStyle + ';"> \
          </button>'
        );

        $('#rbs-apple-button').bind('click', function() {
          _methods.startApplePayPayment();
        });
      }
    },

    getPath: function(name) {
      var ctxLvl = settings.contextLevel;

      var path = {
        applePayValidateMerchant: ctxLvl + "applepay/validateMerchant.do",
        applePaySendPayment: ctxLvl + "applepay/paymentOrder.do"
      };

      return path[name];
    },

    startApplePayPayment: function() {
      var request = {
        countryCode: settings.paymentData.countryCode,
        currencyCode: settings.paymentData.currencyCode,
        supportedNetworks: settings.paymentData.supportedNetworks,
        merchantCapabilities: settings.paymentData.merchantCapabilities,
        total: {
          'label': settings.paymentData.label,
          'amount': settings.paymentData.amount
        }
      };

      var session = _methods.createSession(request);
      session.onvalidatemerchant = function(event) {
        _methods.applePayValidateMerchant(event.validationURL, session);
      };

      session.onpaymentauthorized = function(event) {
        _methods.applePaySendPayment(
          JSON.stringify(event.payment.token.paymentData),
          session,
          settings.paymentData.addParams
        );
      };
      session.begin();
    },

    applePayValidateMerchant: function(validationUrl, session) {
      $.ajax({
        url: _methods.getPath('applePayValidateMerchant'),
        type: 'POST',
        cache: false,
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        data: JSON.stringify({
          mdOrder: settings.paymentData.mdOrder,
          validationUrl: validationUrl
        }),
        error: function() {
          session.abort();
          return true;
        },
        success: function(validationResult) {
          if ('success' in validationResult && validationResult.success) {
            session.completeMerchantValidation(validationResult.data);
          } else {
            session.abort();
          }
          return true;
        }
      });
    },

    createSession: function(request) {
      return new ApplePaySession(1, request);
    },

    applePaySendPayment: function(token, session, addParams) {
      $.ajax({
        url: _methods.getPath('applePaySendPayment'),
        type: 'POST',
        cache: false,
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
          'mdOrder': settings.paymentData.mdOrder,
          'paymentToken': _methods.b64EncodeUnicode(token),
          'additionalParameters': addParams
        }),
        dataType: 'json',
        error: function() {
          session.abort();
          return true;
        },
        success: function(data) {
          if (data.success) {
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
          }
          if ('redirectUrl' in data.data && data.data.redirectUrl) {
            _methods.redirect(data.data.redirectUrl);
          }
          return true;
        }
      });
    },

    redirect: function(destination) {
      if (!/[;<>,]|javascript/g.test(destination)) {
        document.location = destination;
      } else {
        console.warn("Некорректный backUrl");
        return false;
      }
    },

    b64EncodeUnicode: function(str) {
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
          return String.fromCharCode('0x' + p1);
        }));
    }
  };

  $.fn.applePay = function(method) {
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.applePay');
    }
  };
})(jQuery);
