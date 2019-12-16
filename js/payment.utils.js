/*
  Модуль с дополнительными функциями для страницы
*/
var payUtils = (function() {
  var methods = {
    /**
     * Форматирует сумму в красивую. '1234' -> '1 234,00'   '1234.56 RUR' -> '1 234,56'
     * @public
     * @param  {[string, number]}   rawAmount
     * @return {[string]}           Сумма без валюты и с двумя знаками после запятой
     */
    beautyAmount: function (rawAmount) {
      rawAmount = rawAmount.toString();
      rawAmount = rawAmount.replace(/[a-zA-Z ]/g, "");
      rawAmount = Number(rawAmount).toFixed(2);
      var x = rawAmount.split(".");
      var x1 = x[0];
      var x2 = x.length > 1 ? "." + x[1] : "";
      var rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, "$1" + " " + "$2");
      }
      return (x1 + x2).replace('.', ',');
    },

    /**
     * Вернёт версию функции, исполнение которой начнётся не ранее,
     * чем истечёт промежуток wait, после её последнего вызова.
     * http://underscorejs.org/#debounce
     *
     * @public
     * @param  {[function]} func      Функция-родитель
     * @param  {[number]} wait        Время
     * @param  {[boolean]} immediate  Если true - функция будет выполнена сразу, не дожидаясь прошествия wait.
     * @return {[function]}           Функция с задержкой
     */
    debounce: function (func, wait, immediate) {
      var timeout, args, context, timestamp, result;

      var later = function() {
        var last = methods._now - timestamp;

        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            if (!timeout) context = args = null;
          }
        }
      };

      return function() {
        context = this;
        args = arguments;
        timestamp = methods._now;
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };
    },

    /**
     * Вернёт функцию, которая может быть вызвана только один раз.
     * Все последующие её вызовы будут возвращать значение, вычисленное в первый раз.
     *
     * @public
     * @param  {[function]} fn      Функция-родитель
     * @param  {[object]}   context Контекст
     * @return {[function]} функция-обертка
     */
    once: function (fn, context) {
      var result;

      return function() {
        if(fn) {
          result = fn.apply(context || this, arguments);
          fn = null;
        }

        return result;
      };
    },

    /**
     * Возвращает целочисленное значение текущего времени (unix-time timestamp)
     *
     * @private
     * @return {[number]} Время
     */
    _now: function () {
      return new Date().getTime();
    },

    /**
     * Возвращает парметры из url
     *
     * @public
     * @param  {[string]} name    Имя параметра
     * @param  {[string]} url     Ссылка, если не указана берет текущую
     * @return {[string]}         Значение параметра name
     */
    getUrlParam: function (name, url) {
      if (!url) url = window.location.href;
      name = name.replace(/[\[\]]/g, "\\$&");
      var regex = new RegExp("(&amp;|[?&])" + name + "=(([^&#]*)|&|#|$)"),
          results = regex.exec(url),
          resultParam;
      if (!results) return null;
      if (!results[2]) return '';
      resultParam = decodeURIComponent(results[2].replace(/\+/g, " "));
      if (typeof filterXSS === 'function') {
        resultParam = filterXSS(resultParam);
      }
      return resultParam;
    },

    /**
     * Выполняет callback по истечению time
     *
     * @public
     * @param  {[number]} secs       Время в секундах
     * @param  {[function]} callback Имя функции которую нужно вызвать по истечению времени
     */
    timer: function (secs, callback) {
      var milliseconds = secs * 1000;
      if (milliseconds > 2147483647) { // setTimeout using a 32 bit int
        milliseconds = 2147483600;
      }
      setTimeout(function() {
        callback();
      }, milliseconds);
    },

    /**
     * Функция проверка загрузки контента через SSI nginx. Не работает для картинок
     * @param  {[DOM-elem]}  element DOM-элемент родителя элемента, который нужно проверить
     */
    isLoadedContent: function (element) {
      var elContent = element.innerHTML,
        parentElement = element.parentElement;

      // Содержимое в элементе не должно содержать <title> иначе не покажется.
      // Все ошибки NGINX вставляются как html страницы и имеют <title>
      if (elContent == "" || ~elContent.indexOf('<title>')) {
        parentElement.removeChild(element);
      }
    },

    /**
     * Функция проверяет наличие footer'а мерчанта. Если присутствует, то добавляет на страницу
     * @param  {[string]} merchantLogin - логин мерчанта (краткое наименование).
     */
    merchantFooterUpdate: function (merchantLogin) {
      var timeNow = methods._now();
      var urlFooter = '../' + merchantLogin + '/custom/footer.html?timeNow=' + timeNow,
          footer = $('#footer');
      // проверка существования footer'a мерчанта
      $.ajax({
        url: urlFooter,
        dataType: 'html',
        success: function(data) {
          footer.html(data);
        },
        error: function() {
          footer.remove();
        }
      });
    },

    /**
     * Функция проверяет наличие логотипаа мерчанта. Если присутствует, то добавляет на страницу
     * @param  {[string]} merchantLogin - логин мерчанта (краткое наименование).
     */
    merchantLogoUpdate: function (merchantLogin) {
      var timeNow = methods._now();
      var urlImg = '../' + merchantLogin + '/custom/logo.png?timeNow=' + timeNow,
          logo = $('.merchant-logo').find('img'),
          img = new Image();
      // проверка существования логотипа мерчанта
      img.src = urlImg;
      img.onload = function() {
        logo.attr('src', urlImg);
        logo.attr('alt', merchantLogin);
      };
      img.onerror = function(){
        logo.remove();
      };
    },

    /**
     * Возвращает очищенную от html тегов строку
     *
     * @public
     * @param  {[string]} value   Строка
     * @return {[string]}         Очищенная от html тегов строка
     */
    stripHtmlTags: function (value) {
      return value.replace(/(<([^>]+)>)/ig,'');
    },

    /**
     * Предзаполнение поля e-mail или phone, если оно присутствует на странице и его значение пришло с бэка
     *
     * @public
     * @param {[string]} value      - Значение эл. адреса или телефона (свойства 'email' или 'phone' в объекте 'customerDetails')
     * @param {[string]} InputId    - id поля e-mail или phone на странице
     * @param {[string]} fieldType  - Тип поля, email/phone
     */
    customerDetails: function(value, InputId, fieldType) {
      var $inputId = $('#' + InputId);

      if ($inputId.length && value != null) {
        var newValue = value.replace(/\s+/g, '');

        // Если тип поля "телефон", то возвращаем только последние 10 цифр. +7 (999) 111-22-33 -> 9991112233
        if (fieldType === 'phone') {
          newValue = newValue.replace(/[^\d]/g, '').substr(-10);
        }

        $inputId.val(newValue);
      }
    },

    /**
     * Управление отображением поля e-mail по флагу
     *
     * @public
     * @param {[boolean]} show           - Значение эл. адреса (свойства 'email' в объекте 'customerDetails')
     * @param {[string]}  emailContainer - id контейнера e-mail на странице
     */
    showEmail: function(show, emailContainer) {
      var $emailContainer = $('#' + emailContainer);

      if (show) {
        $emailContainer.show();
      } else {
        $emailContainer.hide();
      }
    },

    /**
     * Управление отображением поля phone по флагу
     *
     * @public
     * @param {[boolean]} show           - Значение эл. адреса (свойства 'email' в объекте 'customerDetails')
     * @param {[string]}  phoneContainer - id контейнера e-mail на странице
     */
    showPhone: function(show, phoneContainer) {
      var $phoneContainer = $('#' + phoneContainer);

      if (show) {
        $phoneContainer.show();
      } else {
        $phoneContainer.hide();
      }
    },

    /**
     * Определяет принадлежит ли pan к платежной системе Jcb
     *
     * @param  {[string]} pan     Пан карты (важны первые 4 цифры)
     * @return {[boolean]}        Если true, то платежная система - Jcb
     */
    isJcb: function (pan) {
      pan = pan || "";
      if (pan.length < 4) {
        return false;
      }
      var prefix = Number(pan.slice(0, 4));
      for (var i = 0; i < rangesJcb.length; i++) {
        var range = rangesJcb[i];
        if (prefix >= range.start && prefix <= range.end) {
          return true;
        }
      }
      return false;
    },

    /**
     * Возвращает наименование платежной системы карты (определяет по первым цифрам)
     *
     * @public
     * @param  {[string]} pan     Пан карты (важны первые 4 цифры)
     * @return {[string]}         Наименование платежной системы
     */
    detectPaymentSystem: function(pan) {
        //Visa BIN range [4]
      if (/^4/.test(pan)) {
        return 'VISA';
        //MIR BIN range [220]
      } else if (/^220/.test(pan)) {
        return 'MIR';
        //Discover Club BIN range [6011], [622126-622925], [644-649], [65]
      } else if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9([01][0-9]|2[0-5]))|64[4-9]|65)/.test(pan)) {
        return 'DISCOVER';
        //China UnionPay BIN range [62]
      } else if (/^62/.test(pan)) {
        return 'UNIONPAY';
        //Mastercard BIN ranges [51-55], [2221-2720]
      } else if (/^(5[1-5]|2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7([01][0-9]|20)))/.test(pan)) {
        return 'MASTERCARD';
        //Maestro BIN ranges [50], [56-58], [6]
      } else if (/^(50|5[6-8]|6)/.test(pan)) {
        return 'MAESTRO';
        //JCB BIN range [3528-3589] [3088-3094] [3096-3102]
        // [3112-3120] [3158-3159] [3337-3349]
      } else if (methods.isJcb(pan)) {
        return 'JCB';
      } else if (/^(34|37)/.test(pan)) {
        return 'AMEX';
      } else {
        return '';
      }
    },

    /**
     * Возвращает локаль из имени страницы (например, вернёт 'en' из 'payment_en.html')
     *
     * @public
     * @return {[string]}         Локаль из имени страницы
     */
    getLanguageFromName: function() {
      var url = document.location.href.toLowerCase();
      var start = url.indexOf(".html");
      var _language = url.slice(start - 3, start);
      var language;

      if (/_\w{2}/g.test(_language)) {
        language = _language.slice(1, 3);
      }

      return language || 'ru';
    },

    /**
     * Возвращает true если находит в массиве элемент
     *
     * @public
     * @param array         исходный массив
     * @param value         элемент для поиска
     * @returns {boolean}   true если элемент есть в массиве
     */
    hasItem: function(array, value) {
      return array.indexOf(value) > -1;
    },

    /**
     * Получает данные из localStorage, и, если они есть - парсит
     *
     * @public
     * @param  {[string]} key     Ключ, по которому необходимо получить данные
     * @return {[string]}         false, или данные, преобразованные из JSON
     */
    getFromLocalStorage: function(key) {
      try {
        var storage = localStorage.getItem(key);
      } catch (e) {
        console.warn("Local storage is unavailable in cause of:");
        console.warn(e);
      }

      if (storage === undefined) {
        return null;
      }
      return JSON.parse(storage);
    },

    /**
     * Записывает данные в localStorage, предварительно преобразовав в JSON
     *
     * @public
     * @param  {[string]} key     Ключ, по которому необходимо получить данные
     * @param  {[obj]} data       Объект с данными
     */
    setToLocalStorage: function(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn("Local storage is unavailable in cause of:");
        console.warn(e);
      }
    },

    /**
     * Переделать цифровой код валюты в буквенный
     * @param code
     * @returns {*|string}
     */
    decodeCurrencyCode: function(code) {
      return (
        {
          '643': 'RUB',
          '810': 'RUR',
          '978': 'EUR',
          '840': 'USD',
          '392': 'JPY',
          '980': 'UAH',
          '826': 'GBP',
          '156': 'CNY',
          '974': 'BYR',
          '398': 'KZT',
          '417': 'KGS',
          '408': 'KPW',
          '410': 'KRW',
          '356': 'INR',
        }[String(code)] || 'RUB'
      );
    },

  };

  var rangesJcb = [{
    "start": 3528,
    "end": 3589
  }, {
    "start": 3088,
    "end": 3094
  }, {
    "start": 3096,
    "end": 3102
  }, {
    "start": 3112,
    "end": 3120
  }, {
    "start": 3158,
    "end": 3159
  }, {
    "start": 3337,
    "end": 3349
  }];



  return {
    beautyAmount: methods.beautyAmount,
    debounce: methods.debounce,
    once: methods.once,
    getUrlParam: methods.getUrlParam,
    timer: methods.timer,
    isLoadedContent: methods.isLoadedContent,
    merchantFooterUpdate: methods.merchantFooterUpdate,
    merchantLogoUpdate: methods.merchantLogoUpdate,
    stripHtmlTags: methods.stripHtmlTags,
    customerDetails: methods.customerDetails,
    showEmail: methods.showEmail,
    showPhone: methods.showPhone,
    detectPaymentSystem: methods.detectPaymentSystem,
    getLanguageFromName: methods.getLanguageFromName,
    hasItem: methods.hasItem,
    getFromLocalStorage: methods.getFromLocalStorage,
    setToLocalStorage: methods.setToLocalStorage,
    decodeCurrencyCode: methods.decodeCurrencyCode
  }
}());
