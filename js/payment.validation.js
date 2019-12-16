var payValidation = (function() {
  var methods = {
    validateExpiry: function(month, year) {
      var dateNow = new Date();
      var cardDate = new Date();
      cardDate.setYear(year);
      cardDate.setMonth(month - 1);

      if (dateNow.getTime() > cardDate.getTime() ||
        year > (dateNow.getFullYear() + 25) ||
        month > 12 || !month || !year) {
        return false;
      } else {
        return true;
      }
    },

    validatePan: function(element) {
      var panValue = methods._getElementValue(element);
      panValue = panValue.toString();
      if (~panValue.indexOf(' ')) {
        panValue = panValue.replace(/\s/g, '');
      }

      return /^\d{16,19}$/.test(panValue) && methods._luhn(panValue);
    },

    validateCvc: function(element, paymentSystem) {
      var cvcValue = methods._getElementValue(element);
      return paymentSystem === 'MAESTRO' && cvcValue === '' || /^\d{3,4}$/.test(cvcValue);
    },

    validateCardholder: function(element) {
      var cardholderValue = methods._getElementValue(element);

      return /(\s*\w+\s*((\.|'|-)|\s+|$)){1,}/.test(cardholderValue);
    },

    validateEmail: function(element, required) {
      var emailValue = methods._getElementValue(element);

      return (!required && (emailValue === '' || emailValue === undefined || emailValue === null)) ||
        /^[a-zA-Z0-9._-]{1,64}@([a-zA-Z0-9.-]{2,255})\.[a-zA-Z]{2,255}$/.test(emailValue);
    },

    validatePhone: function(element, required, simple) {
      var phoneValue  = methods._getElementValue(element),
          regTemplate = simple ? /\d{10}/i : /\+7\s\(\d{3}\)\s\d{3}\-\d{4}/i; // 1234567890 / +7 (999) 333-4444

      return (!required && (phoneValue === '' || phoneValue === undefined || phoneValue === null)) || regTemplate.test(phoneValue);
    },

    validateOfd: function(elementEmail, elementPhone, requiredType, phoneValidateSimple) {
      var validate = false;

      if (requiredType === 'both') {
        // Оба поля email и phone должны быть корректно заполнены
        validate = (
          methods.validateEmail(elementEmail, true) &&
          methods.validatePhone(elementPhone, true, phoneValidateSimple)
        );
      } else {
        // Только одно из полей - email или phone должно быть корректно заполнено
        validate = ((
          methods.validateEmail(elementEmail, true) &&
          methods.validatePhone(elementPhone, false, phoneValidateSimple)
        ) || (
          methods.validateEmail(elementEmail, false) &&
          methods.validatePhone(elementPhone, true, phoneValidateSimple)
        ));
      }
      return validate;
    },

    validateAmount: function(amount) {
      return /^\d+(\,\d{1,2})?(\.\d{1,2})?$/.test(amount);
    },

    validateCheckbox: function(idElement) {
      return $('#' + idElement).prop('checked');
    },

    _luhn: function(num) {
      num = (num + '').replace(/\D+/g, '').split('').reverse();
      if (!num.length) {
        return false;
      }
      var total = 0, i;
      for (i = 0; i < num.length; i++) {
        num[i] = parseInt(num[i]);
        total += i % 2 ? 2 * num[i] - (num[i] > 4 ? 9 : 0) : num[i];
      }
      return (total % 10) == 0;
    },

    _getElementValue: function(idElement) {
      if (typeof $ === "function" && typeof jQuery === "function") {
        return $('#' + idElement).val();
      } else {
        return document.getElementById(idElement).value;
      }
    }
  };

  return {
    pan:          methods.validatePan,
    cvc:          methods.validateCvc,
    email:        methods.validateEmail,
    expiry:       methods.validateExpiry,
    phone:        methods.validatePhone,
    ofd:          methods.validateOfd,
    cardholder:   methods.validateCardholder,
    amount:       methods.validateAmount,
    checkbox:     methods.validateCheckbox
  }
}());
window.payValid = payValidation;
