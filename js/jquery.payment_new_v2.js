/**
 * Payment page universal handler
 */
(function($) {
  loadModules([         // Подключение модулей:
    'payUtils',         // - payment.utils.js
    'payment-systems',  // - jquery.payment-systems.js
    'module-3d-secure'  // - jquery.module-3d-secure.js
  ]);
  jQuery.ajaxSettings.traditional = true;

  var settings = {
    // name for orderId parameter
    orderIdParam: "mdOrder",
    language: "ru",

    // orderDetails
    orderId: "orderNumber",
    amount: "amount",
    bonusAmount: "bonusAmount",
    bonusBlock: "bonusBlock",
    description: "description",

    paymentFormId: "formPayment",
    formBindingId: "formBinding",
    acsFormId: "acs",

    pan: "pan_sub",
    panInputId: "pan",
    monthSelectId: "month",
    yearSelectId: "year",
    monthYearSelectId: "monthYear",
    currentYear: (new Date).getFullYear(),
    pageView: payUtils.getUrlParam("pageView"),
    cardholderInputId: "cardholder",
    cvcInputId: "cvc",
    agreeCheckboxId: "agreeCheckbox",
    agreeUrlId: "agreeHref",
    feeAmount: "feeAmount",
    cvcBindingInputId: "cvc_binding",
    paramPrefix: 'additional-param',

    bindingBlockId: "bindingBlock",
    bindingCheckBoxId: "createBinding",
    deactiveBindingBtnId: "deactiveBindingBtn",
    deactiveBindingId: "deactiveBinding",
    feeBlockId: "feeBlock",
    agreeBlockId: "agreeBlock",
    errorBlockId: "errorBlock",
    infoBlockId: "infoBlock",
    numberCountdownId: "numberCountdown",
    indicatorId: "indicator",
    bindingId: "bindingId",
    currencyClass: "currency",
    panCardTypeClass: 'pan-card-type',

    buttonPaymentId: "buttonPayment",

    onlyBindings: false, // Если есть связки, то позволять оплачивать только ими
    getFeeEnabled: false,
    bindingCheckboxEnabled: false,
    agreementCheckboxEnabled: false,
    currencyIcon: false,
    showPaymentSystem: true,

    // email option
    emailInputId: "email",
    emailContainer: "emailContainer",
    emailDescription: "emailDescription",
    emailDescriptionOfd: "emailDescriptionOfd",
    showEmailAlways: false,
    showEmailDescription: false,
    hideEmailWithCustomerDetails: false,

    // phone  option
    phoneInputId: "phone",
    phoneContainer: "phoneContainer",
    phoneDescription: "phoneDescription",
    phoneDescriptionOfd: "phoneDescriptionOfd",
    phoneValidateSimple: true,
    showPhoneAlways: false,
    showPhoneDescription: false,
    hidePhoneWithCustomerDetails: false,

    // ofd option
    ofdDescriptionPhone: "",
    ofdDescriptionEmail: "",
    ofdEnabled: false,
    showOfdDescription: false,
    ofdValidateType: "one", // Правило валидации полей при ОФД: одно поле или оба поля должны быть валидны - one/both

    paymentAction: "../../rest/processform.do",
    paymentBindingAction: "../../rest/processBindingForm.do",
    getSessionStatusAction: "../../rest/getSessionStatus.do",
    showErrorAction: "../../rest/showErrors.do",
    getFeeAction: "../../rest/getFee.do",
    unbindCard: "../../rest/unbindcardanon.do",

    messageAjaxError: "Сервис временно недоступен. Попробуйте позднее.",
    messageTimeRemaining: "До окончания сессии осталось #HOU#:#MIN#:#SEC#",
    messageRedirecting: "Переадресация...",
    paramNames: [],

    layerPaymentSystemLogo: ".payment-logos",
    layerPaymentSystemText: ".payment-text",
    layerSecuritySystemLogo: ".verify",
    layerSecuritySystemText: ".verify-text",
    paymentSystemsSettings: {},

    onReady: function() {
    },

    updatePage: function(data) {
      var amount   = data[settings.amount].replace(/[a-zA-Z ]/g, ""),
          currency = data[settings.amount].substr(-3);

      $("#" + settings.orderId).text(data[settings.orderId]);
      $("#" + settings.amount).text(payUtils.beautyAmount(amount));
      $("#" + settings.description).text(data[settings.description]);

      // Как отображать валюту - ввиде знака ($) или сокращением (USD)
      if (settings.currencyIcon) {
        $('.' + settings.currencyClass).addClass(currency + ' currency-icon').empty();
      } else {
        $('.' + settings.currencyClass).text(currency);
      }

      if (data[settings.bonusAmount] > 0) {
        $("#" + settings.bonusBlock).show();
        $("#" + settings.bonusAmount).text(data[settings.bonusAmount] / 100);
      } else {
        $("#" + settings.bonusBlock).hide();
      }
      if (data.queriedParams) {
        $.each(data.queriedParams, function(name, value) {
          var el = $('#' + name);
          if (el && el.is('a')) {
            el.attr('href', methods.checkXssUrl(value));
          } else if (el) {
            if (el.val) el.val(value);
            if (el.text) el.text(value);
          }
          // Поддержка кнопки "вернуться в магазин"
          if (name === 'backToShopUrl') {
            $('.back-to-shop').show();
            $('.back-to-shop__link').attr('href', methods.checkXssUrl(value));
          }
          if (name === 'backToShopName') {
            $('.back-to-shop__link').text(value);
          }
        });
      }
    }
  };

  var properties = {
    orderId: null,
    expired: false,
    isBindingEnabled: false,
    fee: 0,
    feeChecked: false,
    isAgreementEnabled: true
  };

  var methods = {
    maestroCheck: {
      pan: "",
      result: false
    },

    init: function(options) {
      if (options) {
        $.extend(settings, options);
      }

      return this.each(function() {
        $(this).ready(methods.fillControls);
        // init data
        var orderId = payUtils.getUrlParam(settings.orderIdParam);
        if (!orderId) {
          console.warn("Номер заказа неизвестен / Unknown order");
          return;
        }
        properties.orderId = orderId;
        properties.expired = false;

        // Set 3DSecure
        $(this).module3DSecure('setNewSettings', {orderId: orderId, staticType: 'payment'});
        $(this).payment('getSessionStatus', true);
      });
    },

    checkControl: function(name) {
      if ($(name).length === 0) {
        alert('Absent ' + name + ' . Please, check documentation or template page');
      }
    },

    checkControls: function() {
      methods.checkControl('#' + settings.paymentFormId);
      methods.checkControl("#" + settings.panInputId);
      methods.checkControl("#" + settings.cardholderInputId);
      methods.checkControl("#" + settings.cvcInputId);

      if ($("#" + settings.monthYearSelectId).length === 0) {
        methods.checkControl("#" + settings.yearSelectId);
        methods.checkControl("#" + settings.monthSelectId);
      }

      if (settings.bindingCheckboxEnabled) methods.checkControl('#' + settings.bindingCheckBoxId);

      methods.checkControl('#' + settings.orderId);
      methods.checkControl('#' + settings.amount);

      methods.checkControl('#' + settings.buttonPaymentId);
      methods.checkControl('#' + settings.errorBlockId);
      methods.checkControl('#' + settings.numberCountdownId);
      methods.checkControl('#' + settings.infoBlockId);
    },

    bindControls: function() {
      methods.checkControls();
      $('#' + settings.paymentFormId).bind('submit.payment', methods.onSubmit);
      $('#' + settings.panInputId).bind('keypress.payment', methods.checkNumberInput);
      $("#" + settings.pan).bind('input.payment keyup.payment paste.payment', function(e) {
        methods.markValidField(settings.panInputId, payValid.pan(settings.panInputId));
        methods.markValidField(settings.agreeCheckboxId, payValid.checkbox(settings.agreeCheckboxId)); // валидация для поля согласия
        methods.validateAll();
        methods.showPaymentSystem(e);
        methods.getFee(); // Запрос информации о комиссии
      });

      $("#" + settings.yearSelectId + ", #" + settings.monthSelectId + ", #" + settings.monthYearSelectId)
        .bind('keyup.payment change.payment', function() {
          methods.markValidField(settings.yearSelectId, payValid.expiry($('#' + settings.monthSelectId).val(), $('#' + settings.yearSelectId).val()));
          methods.validateAll();
        });

      $('#' + settings.cvcInputId).bind('input.payment keyup.payment paste.payment', function(e) {
        methods.checkNumberInput(e);
        methods.markValidField(settings.cvcInputId, payValid.cvc(settings.cvcInputId));
        methods.validateAll();
      });

      $('#' + settings.cvcBindingInputId).bind('input.payment keyup.payment paste.payment', function(e) {
        methods.checkNumberInput(e);
        methods.markValidField(settings.cvcBindingInputId, payValid.cvc(settings.cvcBindingInputId));
        methods.markValidField(settings.agreeCheckboxId, payValid.checkbox(settings.agreeCheckboxId)); // валидация для поля согласия
        methods.validateAll();
      });

      $('#' + settings.cardholderInputId).bind('input.payment keyup.payment paste.payment', function(e) {
        methods.checkNameInput(e);
        methods.markValidField(settings.cardholderInputId, payValid.cardholder(settings.cardholderInputId));
        methods.validateAll();
      });

      $('#' + settings.agreeCheckboxId).bind('click.payment keypress.payment', function() {
        methods.markValidField(settings.agreeCheckboxId, payValid.checkbox(settings.agreeCheckboxId));
        methods.validateAll();
      });

      $('#' + settings.deactiveBindingId).bind('click', methods.deactiveBinding);

      $('#' + settings.emailInputId).bind('input.payment keyup.payment', function() {
        methods.markValidField(settings.emailInputId, payValid.email(settings.emailInputId, false));
        methods.validateAll();
      });

      $('#' + settings.phoneInputId).bind('input.payment keyup.payment', function(e) {
        methods.checkPhoneInput(e);
        methods.markValidField(settings.phoneInputId, payValid.phone(settings.phoneInputId, false, settings.phoneValidateSimple));
        methods.validateAll();
      });

      $('#' + settings.buttonPaymentId)
        .bind('click.payment', methods.doSubmitForm)
        .attr('disabled', 'true');
    },

    // Простановка лет в будущее селекте expiry
    fillControls: function() {
      methods.bindControls();
      $('#' + settings.yearSelectId).empty();
      var year = settings.currentYear;
      while (year < settings.currentYear + 21) {
        var option = "<option value=" + year + ">" + year + "</option>";
        $('#' + settings.yearSelectId).append($(option));
        year++;
      }
    },

    checkNumberInput: function(event) {
      var elem = $(event.target);
      elem.val(elem.val().replace(/\D/g, ""));
    },

    checkPhoneInput: function(event) {
      var elem = $(event.target);
      elem.val(elem.val().replace(/[^\d\(\)\+\-\s]/g, ""));
    },

    checkNameInput: function(event) {
      var elem = $(event.target);
      elem.val(elem.val().replace(/[^a-zA-Z\- ]/g, ""));
    },

    onSubmit: function(event) {
      event.preventDefault();
      if ($('#' + settings.formBindingId).is(':visible')) {
        methods.sendBindingPayment();
      } else {
        methods.sendPayment();
      }
    },

    switchActions: function(isEnabled) {
      var $buttonPayment = $('#' + settings.buttonPaymentId);

      if (isEnabled && $buttonPayment.attr('disabled')) {
        $buttonPayment.attr('disabled', false);
      }
      if (!isEnabled && !$buttonPayment.attr('disabled')) {
        $buttonPayment.attr('disabled', true);
      }
    },

    doSubmitForm: function() {
      if (!methods.validateAll()) return;
      if (settings.getFeeEnabled && properties.fee > 0 && !properties.feeChecked) return;
      methods.switchActions(false);
      $('#' + settings.paymentFormId).submit();
    },

    validateAll: function() {
      var arrayValidation = [true];

      // Если отображается обычная платежная форма, то валидируем её
      if ($('#' + settings.paymentFormId).is(':visible')) {
        arrayValidation = [
          payValid.pan(settings.panInputId),
          payValid.expiry($('#' + settings.monthSelectId).val(), $('#' + settings.yearSelectId).val()),
          payValid.cardholder(settings.cardholderInputId),
          payValid.email(settings.emailInputId, false)
        ];
        if ($('#' + settings.cvcInputId).is(':visible')) {
          arrayValidation.push(payValid.cvc(settings.cvcInputId));
        }
      }

      // Валидация для связок
      if ($('#' + settings.formBindingId).is(':visible') && $('#' + settings.cvcBindingInputId).is(':visible')) {
        arrayValidation = [
          payValid.cvc(settings.cvcBindingInputId)
        ];
      }

      // Валидация блока согласия
      if (settings.agreementCheckboxEnabled && $('#' + settings.agreeBlockId).is(':visible')) {
        arrayValidation.push(payValid.checkbox(settings.agreeCheckboxId));
      }

      // Валидация ОФД
      if (settings.ofdEnabled && ($('#' + settings.emailInputId).is(':visible') || $('#' + settings.phoneInputId).is(':visible'))) {
        var ofdValid = payValid.ofd(settings.emailInputId, settings.phoneInputId, settings.ofdValidateType, settings.phoneValidateSimple);
        arrayValidation.push(ofdValid);
        methods.markValidField(settings.phoneInputId, ofdValid);
        methods.markValidField(settings.emailInputId, ofdValid);
      }

      var validateAll = !arrayValidation.some(function(item) {
        return item === false;
      });

      // Не делаем проверку если идет запрос к серверу
      if (!$('body').hasClass('loading-active')) {
        methods.switchActions(validateAll);
      }
      return validateAll;
    },

    showProgress: function() {
      $('#' + settings.errorBlockId).empty();
      $('#' + settings.indicatorId).show();
      $('body').addClass('loading-active');
    },

    hideProgress: function() {
      $('#' + settings.indicatorId).hide();
      $('body').removeClass('loading-active');
    },

    showError: function(message) {
      methods.hideProgress();
      if (typeof filterXSS === 'function') message = filterXSS(message);
      $('#' + settings.errorBlockId).empty().prepend('<p>' + message + "</p>");
    },

    // Вывод логотипа платежной системы около поля ввода ПАНа
    showPaymentSystem: function(event) {
      if (!settings.showPaymentSystem) return false;

      var elem          = $(event.target),
          pan           = elem.val(),
          paymentSystem = payUtils.detectPaymentSystem(pan);
      elem.parents().find('.' + settings.panCardTypeClass)
        .removeClass('MASTERCARD MIR VISA MAESTRO JCB')
        .addClass(paymentSystem);

    },

    redirect: function(destination, message) {
      if (message) {
        if (typeof filterXSS === 'function') message = filterXSS(message);
        $('#' + settings.infoBlockId).empty().prepend('<p>' + message + "</p>");
      }
      $('#' + settings.numberCountdownId).hide();
      $('#' + settings.errorBlockId).empty();
      $('#' + settings.paymentFormId).attr('expired', '1');
      methods.switchActions(false);

      if (!/[;<>,]|javascript/g.test(destination)) {
        document.location = destination;
      } else {
        console.warn("Некорректный backUrl");
        return false;
      }
    },

    checkXssUrl: function(url) {
      if (!/[;<>,]|javascript/g.test(url)) {
        return url;
      } else {
        return '#';
      }
    },

    startCountdown: function(remainingSecs) {
      $(document).oneTime(remainingSecs * 1000, function() {
        $('#' + settings.paymentFormId).prop('expired', '1');
        methods.validateAll();
      });

      $('#' + settings.numberCountdownId).everyTime(1000, function(i) {
        if (settings.messageTimeRemaining.indexOf("#HOU#") + 1) {
          var secondsLeft = remainingSecs - i;
          var seconds = secondsLeft % 60;
          var hours = Math.floor(secondsLeft / 3600);
          var minutes = Math.floor((secondsLeft - hours * 3600) / 60);
        } else {
          var secondsLeft = remainingSecs - i;
          var seconds = secondsLeft % 60;
          var minutes = Math.floor(secondsLeft / 60)
          var hours = "";
        }
        if (seconds < 10) {
          seconds = "0" + seconds;
        }
        if (minutes < 10) {
          minutes = "0" + minutes;
        }
        $(this).text(settings.messageTimeRemaining
          .replace("#HOU#", new String(hours))
          .replace("#MIN#", new String(minutes))
          .replace("#SEC#", new String(seconds)));
        if (secondsLeft <= 0) {
          methods.getSessionStatus(false);
        }
      }, remainingSecs);
    },

    setupAgreementBlock: function(data) {
      if ('agreementUrl' in data && data.agreementUrl !== null && data.agreementUrl !== 'null' &&
        data.agreementUrl !== '' && data.agreementUrl !== '#') {
        $('#' + settings.agreeUrlId).attr('href', data.agreementUrl);
      } else {
        $('#' + settings.agreeBlock).hide();
        properties.isAgreementEnabled = false;
      }
    },

    // Настройка отображения полей email / phone
    showCustomFields: function(data) {
      // Можно включить отображения полей email / phone за счет настроек мерчанта
      if ('sessionParams' in data) {
        for (var i in data.sessionParams) {
          switch (data.sessionParams[i]) {
            case "OFD_ENABLED"  :
              settings.ofdEnabled = true;
              settings.showEmailAlways = true;
              settings.showPhoneAlways = true;
              break;
            case "EMAIL_ENABLED":
              settings.showEmailAlways = true;
              break;
            case "PHONE_ENABLED":
              settings.showPhoneAlways = true;
              break;
            default:
          }
        }
      }

      // Если включено скрывать поле email/phone, если получены из сессии - скрываем email / phone
      if (settings.hideEmailWithCustomerDetails && data.customerDetails.email != null) settings.showEmailAlways = false;
      if (settings.hidePhoneWithCustomerDetails && data.customerDetails.phone != null) settings.showPhoneAlways = false;

      // Включение отображения контенейров email / phone
      payUtils.showEmail(settings.showEmailAlways, settings.emailContainer);
      payUtils.showPhone(settings.showPhoneAlways, settings.phoneContainer);

      // Включение отображения описания к полям email / phone
      if (settings.showEmailDescription) $('#' + settings.emailDescription).show();
      if (settings.showPhoneDescription) $('#' + settings.phoneDescription).show();

      // Включение отображения  ОФД описания к полям email / phone
      if (settings.ofdEnabled && settings.showOfdDescription) {
        if (settings.ofdDescriptionEmail) $('#' + settings.emailDescriptionOfd).text(settings.ofdDescriptionEmail);
        if (settings.ofdDescriptionPhone) $('#' + settings.phoneDescriptionOfd).text(settings.ofdDescriptionPhone);

        $('#' + settings.emailDescription + ', #' + settings.phoneDescription).hide();
        $('#' + settings.emailDescriptionOfd + ', #' + settings.phoneDescriptionOfd).show();
      }
    },

    setupBindingForm: function(data) {
      var bindingForm = $('#' + settings.formBindingId);
      var bindingItems = data.bindingItems;

      if (data.bindingEnabled && settings.bindingCheckboxEnabled) {
        properties.isBindingEnabled = true;
        $('#' + settings.bindingBlockId).show();
      }

      if (!('bindingItems' in data) || !bindingItems || !bindingItems.length) {
        return;
      }

      bindingForm.show();
      $('#' + settings.paymentFormId).hide();

      // Build binding select control
      var bindingSelect = $('#' + settings.bindingId);

      if (bindingSelect.length != 1) {
        alert('Binding selector not found');
      }

      for (var i = 0; i < bindingItems.length; i++) {
        var o = $('<option value="' + bindingItems[i].id + '">' + bindingItems[i].label + '</option>');
        bindingSelect.append(o);
      }

      if (!settings.onlyBindings) {
        var textOtherCard = (typeof getLocalizedText === 'function') ? getLocalizedText('otherCard') : (settings.language === 'ru') ? 'Другая карта...' : 'Other card...';
        bindingSelect.append('<option value="OTHER">' + textOtherCard + '</option>');
      }

      $('#' + settings.bindingId).bind('change', function(e) {
        if (e.target.value === 'OTHER') {
          $('#' + settings.paymentFormId).show();
          $('#' + settings.formBindingId).hide();
          $('#returnToBindingsBlock').show();
        }
      });

      $('#returnToBindings').bind('click', function(e) {
        e.preventDefault();
        $('#' + settings.paymentFormId).hide();
        $('#' + settings.formBindingId).show();
        $('#returnToBindingsBlock').hide();
        bindingSelect.val(bindingItems[0].id);
      });

      methods.validateAll();
    },

    getAdditionalParams: function(paymentFormId) {
      var jsonParams = '{';
      $(" input." + settings.paramPrefix).each(function(index, element) {
        jsonParams += '"' + element.name + '":"' + element.value + '",'
      });
      if (jsonParams.length > 1) jsonParams = jsonParams.substr(0, jsonParams.length - 1);
      jsonParams += "}";
      return jsonParams;
    },

    sendBindingPayment: function(tdsTransId) {
      methods.showProgress();

      var orderId     = properties.orderId,
          jsonParams  = methods.getAdditionalParams(settings.formBindingId),
          paymentData = {
            'orderId': orderId,
            'bindingId': $('#' + settings.bindingId).val(),
            'cvc': $('#cvc_binding').val(),
            'language': settings.language,
            'email': $("#" + settings.emailInputId).val(),
            'jsonParams': jsonParams
          };

      if (tdsTransId) {
        paymentData.threeDSServerTransId = tdsTransId;
      }

      $.ajax({
        url: settings.paymentBindingAction,
        type: 'POST',
        cache: false,
        data: paymentData,
        dataType: 'json',
        error: function() {
          methods.showError(settings.messageAjaxError);
          return true;
        },
        success: function(data) {
          methods.switchActions(true);
          methods.hideProgress();
          if (!tdsTransId) {
            // Если первый раз идем на 3ds 2, то дальнейшее выполнение останавливаем
            if ($(this).module3DSecure('check3ds2', data, 'sendBindingPayment')) {
              return;
            }
          }

          if (data.acsUrl != null) {
            $(this).module3DSecure('checkRedirectToAcs', data);
          } else if ('error' in data) {
            methods.showError(data.error);
          } else if ('redirect' in data) {
            methods.redirect(data.redirect, data.info, settings.messageRedirecting);
          }
          return true;
        }
      });
      return false;
    },

    getSessionStatus: function(informRbsOnLoad) {
      methods.showProgress();
      var orderId = properties.orderId;
      $.ajax({
        url: settings.getSessionStatusAction,
        type: 'POST',
        cache: false,
        data: ({
          MDORDER: orderId,
          language: settings.language,
          informRbsOnLoad: informRbsOnLoad,
          pageView: settings.pageView,
          paramNames: settings.paramNames
        }),
        dataType: 'json',
        error: function() {
          methods.showError(settings.messageAjaxError);
        },
        success: function(data) {
          // проверка на ACS после неуспешных попыток
          if ('acsUrl' in data && data.acsUrl !== null) {
            return $(this).module3DSecure('checkRedirectToAcs', data);
          }

          function fillData() {
            // убираем строки в информации о заказе если они пустые
            methods.checkEmptyValue(settings.description, data.description);
            methods.checkEmptyValue(settings.bonusAmount, data.bonusAmount);

            settings.updatePage(data);
            var remainingSecs = data.remainingSecs;
            if (remainingSecs > 0) {
              methods.startCountdown(remainingSecs);
              methods.setupBindingForm(data);
              methods.setupAgreementBlock(data);
            } else {
              methods.redirect(settings.showErrorAction, settings.messageRedirecting);
            }
          }

          // Скрываем CVC если оно не обязательно
          if (data.cvcNotRequired) {
            $('#' + settings.cvcInputId).closest('.row').hide();
            $('#' + settings.cvcBindingInputId).closest('.row').hide();
          }

          // Комиссия
          if ('feeEnabled' in data) {
            settings.getFeeEnabled = data.feeEnabled;
            if (settings.getFeeEnabled) {
              methods.checkFee();
            }
          }

          methods.hideProgress();
          if ('error' in data) {
            methods.showError(data.error);
            if (('remainingSecs' in data) && ('amount' in data)) {
              fillData();
            }
          } else if ('redirect' in data) {
            methods.redirect(data.redirect, settings.messageRedirecting);
          } else {
            fillData();
          }

          if ('merchantOptions' in data) {
            settings.paymentSystemsSettings.merchantOptions = data.merchantOptions;
            $(document).paymentSystems('setNewSettings', settings.paymentSystemsSettings);

            var language = settings.language;
            if (typeof language === 'function') {
              language = language();
            }

            $(settings.layerPaymentSystemLogo).paymentSystems('showLogos', 'payment');
            $(settings.layerPaymentSystemText).paymentSystems('showTexts', 'payment', language);

            $(settings.layerSecuritySystemLogo).paymentSystems('showLogos', 'verify');
            $(settings.layerSecuritySystemText).paymentSystems('showTexts', 'verify', language);
          }

          if ('merchantInfo' in data) {
            payUtils.merchantFooterUpdate(data.merchantInfo.merchantLogin);
            payUtils.merchantLogoUpdate(data.merchantInfo.merchantLogin);
          }

          if ('customerDetails' in data) {
            payUtils.customerDetails(data.customerDetails.email, settings.emailInputId);
            payUtils.customerDetails(data.customerDetails.phone, settings.phoneInputId, 'phone');
          }

          // Настройка отображения email / phone
          methods.showCustomFields(data);

          if ('bindingDeactivationEnabled' in data && !data.bindingDeactivationEnabled) {
            $('#' + settings.bindingId).removeClass('bindings-select');
            $('#' + settings.deactiveBindingId).remove();
            $('#' + settings.deactiveBindingBtnId).remove();
          }

          settings.onReady(methods.getSessionObject(data));
          return true;
        }
      });
    },

    sendPayment: function(tdsTransId) {
      methods.showProgress();
      var orderId          = properties.orderId,
          bindingNotNeeded = settings.bindingCheckboxEnabled && !$("#" + settings.bindingCheckBoxId).prop("checked"),
          jsonParams       = methods.getAdditionalParams(settings.paymentFormId);

      var paymentData = {
        MDORDER: orderId,
        $EXPIRY: $("#expiry").attr("value"),
        $PAN: $("#" + settings.panInputId).val(),
        MM: $("#" + settings.monthSelectId).val(),
        YYYY: $("#" + settings.yearSelectId).val(),
        TEXT: $("#" + settings.cardholderInputId).val(),
        $CVC: $("#" + settings.cvcInputId).val(),
        language: settings.language,
        email: $("#" + settings.emailInputId).val(),
        bindingNotNeeded: bindingNotNeeded,
        jsonParams: jsonParams
      };

      if (tdsTransId) {
        paymentData.threeDSServerTransId = tdsTransId;
      }

      $.ajax({
        url: settings.paymentAction,
        type: 'POST',
        cache: false,
        data: paymentData,
        dataType: 'json',
        error: function() {
          methods.showError(settings.messageAjaxError);
          methods.switchActions(true);
          return true;
        },
        success: function(data) {
          if (!tdsTransId) {
            // Если первый раз идем на 3ds 2, то дальнейшее выполнение останавливаем
            if ($(this).module3DSecure('check3ds2', data, 'sendPayment')) {
              return;
            }
          }

          methods.hideProgress();
          methods.switchActions(true);

          if (data.acsUrl != null) {
            $(this).module3DSecure('checkRedirectToAcs', data);
          } else if ('error' in data) {
            methods.showError(data.error);
          } else if ('redirect' in data) {
            methods.redirect(data.redirect, data.info, settings.messageRedirecting);
          }
          return true;
        }

      });
    },

    deactiveBinding: function() {
      methods.showProgress();
      var orderId = properties.orderId;
      $.ajax({
        url: settings.unbindCard,
        type: 'POST',
        cache: false,
        data: {
          mdOrder: orderId,
          bindingId: $('#' + settings.bindingId).val(),
        },
        dataType: 'json',
        error: function() {
          methods.hideProgress();
          methods.showError(settings.messageAjaxError);
          return true;
        },
        success: function(data) {
          methods.hideProgress();
          if (data.errorCode == 0) {
            $("#bindingId option:selected").remove();
            $("#" + settings.deactiveBindingBtnId).hide();
            $(document).trigger("deactivedBinding");
            $('#' + settings.bindingId).change();
          } else {
            methods.showError(settings.messageAjaxError);
          }
          return true;
        }
      });
    },

    checkFee: function() {
      $.ajax({
        url: settings.getFeeAction,
        type: 'POST',
        cache: false,
        data: ({
          mdOrder: $.url.param("mdOrder"),
          pan: '0'
        }),
        dataType: 'json',
        error: function() {
          methods.showError(settings.messageAjaxError);
        },
        success: function(data) {
          if ('errorCode' in data && data.errorCode == 0) {
            if (data.fee != '0.00') {
              properties.fee = parseFloat(data.fee.replace(',', '.')).toFixed(2);
              $("#" + settings.feeAmount).text(payUtils.beautyAmount(properties.fee));
            }

            $('#' + settings.feeBlockId).show();

            if (properties.isAgreementEnabled) {
              $('#' + settings.agreeBlockId).show();
              settings.agreementCheckboxEnabled = true;
            }

            // Если отображается binding форма, то устанавливаем feeChecked = true, т.к. methods.getFee() вызываться не будет.
            if ($('#' + settings.formBindingId).is(':visible')) properties.feeChecked = true;
          }
        }
      });
    },

    getFee: function() {
      if (!payValid.pan(settings.panInputId)) return;
      if (!settings.getFeeEnabled) return;

      properties.feeChecked = false;

      var orderId = properties.orderId;
      $.ajax({
        url: settings.getFeeAction,
        type: 'POST',
        cache: false,
        data: ({
          mdOrder: orderId,
          pan: $("#" + settings.panInputId).val()
        }),
        dataType: 'json',
        error: function() {
          methods.showError(settings.messageAjaxError);
        },
        success: function(data) {
          if ('errorCode' in data && data.errorCode == 0) {
            properties.fee = parseFloat(data.fee.replace(',', '.')).toFixed(2);
            $("#" + settings.feeAmount).text(payUtils.beautyAmount(properties.fee));
            properties.feeChecked = true;
          }
          return true;
        }
      });
    },

    markValidField: function(field, isValid) {
      if (isValid) {
        $('.' + field + '-validation').removeClass('invalid').addClass('valid');
      } else {
        $('.' + field + '-validation').removeClass('valid').addClass('invalid');
      }
    },

    checkEmptyValue: function(field, value) {
      if (value == null || value == 'null' || value == '') {
        $('#' + field).closest('.row').hide();
      }
    },

    // получение красивого объекта
    getSessionObject: function(sessionData) {
      sessionData.rawAmount = (sessionData[settings.amount]).replace(/[a-zA-Z ]/g, "");
      sessionData.currency = (sessionData[settings.amount]).substr(-3);
      sessionData.mdOrder = payUtils.getUrlParam('mdOrder');

      return sessionData;
    }
  };

  $.fn.payment = function(method) {
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.payment');
    }
  };
})(jQuery);

/**
 * Algorithm luna
 * @param  {number} num "сырой" пан, который проверяется
 * @return {boolean} прошел ли пан проверку
 */
function luhn(num) {
  num = (num + '').replace(/\D+/g, '').split('').reverse();
  if (!num.length) return false;
  var total = 0, i;
  for (i = 0; i < num.length; i++) {
    num[i] = parseInt(num[i]);
    total += i % 2 ? 2 * num[i] - (num[i] > 4 ? 9 : 0) : num[i];
  }
  return (total % 10) == 0;
}

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
      cache: true,
      success: function() {
        if (Array.isArray(arr)) {
          moduleLoader.connectionCheck(arr);
          return true;
        } else {
          return false;
        }
      },
      error: function() {
        console.warn('Failed to load moduleLoader.');
      }
    });
  } else {
    if (Array.isArray(arr)) {
      moduleLoader.connectionCheck(arr);
      return true;
    } else {
      return false;
    }
  }
}
