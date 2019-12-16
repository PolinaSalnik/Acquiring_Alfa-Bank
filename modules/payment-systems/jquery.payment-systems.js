/**
 * jQuery.paymentSystems
 * Date: 25.06.2019
 * @version 1.1
 *
 * Модуль для вывода логотипов и текстовой информации о платежных системах и системах безопасности:
 * VISA, MASTERCARD, MAESTRO, MIR, JCB
 *
 * Usage:
 *
 * Передаем merchantOptions
 * $(document).paymentSystems('setMerchantOptions',data.merchantOptions);
 *
 * Передаем merchantOptions / изменяем settings
 * $(document).paymentSystems('setNewSettings', settings.paymentSystemsSettings);
 *
 * Выводим логотипы платежных систем и систем безопасности
 * $(settings.layerPaymentSystemLogo).paymentSystems('showLogos', 'payment');
 * $(settings.layerPaymentSystemText).paymentSystems('showTexts', 'payment');

 * Выводим текстовую информацию о платежных системах и системах безопасности
 * $(settings.layerSecuritySystemLogo).paymentSystems('showLogos', 'verify', settings.language);
 * $(settings.layerSecuritySystemText).paymentSystems('showTexts', 'verify', settings.language);
 */
(function($) {
  jQuery.ajaxSettings.traditional = true;

  var settings = {
    language: 'ru',
    languageDefault: 'en',
    layer: '',
    groupName: '',
    merchantOptions: [],                          // Список для вывода в статике            ["VISA_TDS", "MASTERCARD_TDS", "PCI_TDS", "MIR_TDS", ...]
    merchantOptionsAdditionally: ["PCI_TDS"],     // Значения, обязательные к отображению   ["PCI_TDS", "MIR-GREEN_TDS"]
    merchantOptionsDelete: [],                    // Значение, которые необходимо удалить   ['MIR_TDS'],
    merchantOptionsAdd: [],                       // Значение, которые необходимо добавить  ['MIR-GREEN_TDS'],
    merchantOptionsChange: [],                    // Значения которые необходимо заменить   [{search: 'MIR_TDS', change: 'MIR-GREEN_TDS'}]
    dirImg: 'modules/payment-systems/img/',
    imgFileExtension: 'svg',
    showLog: false,
    imgLayerClear: true,

    group: {
      payment: {
        namePrefix: 'logo-',
        list: [
          {
            systemName: 'VISA',
            logoHeight: 20,
            text: {
              ru: 'Visa Inc.',
              en: 'Visa Inc.',
              by: 'Visa Inc.',
            }
          },
          {
            systemName: 'MIR',
            logoHeight: 20,
            text: {
              ru: '«МИР»',
              by: '«МИР»',
              en: 'MIR'
            }
          },
          {
            systemName: 'MASTERCARD',
            logoHeight: 40,
            text: {
              ru: 'Mastercard',
              by: 'Mastercard',
              en: 'Mastercard'
            }
          },
          {
            systemName: 'MAESTRO',
            logoHeight: 40,
            text: {
              ru: 'Maestro',
              by: 'Maestro',
              en: 'Maestro'
            }
          },
          {
            systemName: 'JCB',
            logoHeight: 40,
            text: {
              ru: 'JCB',
              by: 'JCB',
              en: 'JCB'
            }
          },
          {
            systemName: 'AMEX',
            logoHeight: 40,
            text: {
              ru: 'American Express',
              by: 'American Express',
              en: 'American Express'
            }
          },
          {
            systemName: 'CUP',
            logoHeight: 40,
            text: {
              ru: 'China UnionPay',
              by: 'China UnionPay',
              en: 'China UnionPay'
            }
          },
          {
            systemName: 'DINERSCLUB',
            logoHeight: 40,
            text: {
              ru: 'Diners Club',
              by: 'Diners Club',
              en: 'Diners Club'
            }
          },
          {
            systemName: 'BELCARD',
            logoHeight: 40,
            text: {
              ru: 'БЕЛКАРТ',
              by: 'БЕЛКАРТ',
              en: 'BELCARD'
            }
          },
          {
            systemName: 'DISCOVER',
            logoHeight: 30,
            text: {
              ru: 'DISCOVER',
              by: 'DISCOVER',
              en: 'DISCOVER'
            }
          }
        ]
      },
      verify: {
        namePrefix: 'verify-',
        list: [
          {
            systemName: 'VISA_TDS',
            logoHeight: 40,
            text: {
              ru: 'Verified by Visa',
              by: 'Verified by Visa',
              en: 'Verified by Visa'
            }
          },
          {
            systemName: 'MASTERCARD_TDS',
            logoHeight: 40,
            text: {
              ru: 'Mastercard Identity Check',
              by: 'Mastercard Identity Check',
              en: 'Mastercard Identity Check'
            }
          },
          {
            systemName: 'MIR_TDS',
            logoHeight: 40,
            version: '20190626',
            text: {
              ru: 'Mir Accept',
              by: 'Mir Accept',
              en: 'Mir Accept'
            }
          },
          {
            systemName: 'JCB_TDS',
            logoHeight: 40,
            text: {
              ru: 'J/Secure',
              by: 'J/Secure',
              en: 'J/Secure'
            }
          },
          {
            systemName: 'PCI_TDS',
            logoHeight: 40,
            text: {
              ru: '',
              by: '',
              en: ''
            }
          }
        ]
      }
    },

    union: {
      'and': {
        ru: 'и',
        by: 'i',
        en: 'and'
      },
      'or': {
        ru: 'или',
        by: 'або',
        en: 'or'
      }
    }
  };

  var methods = {

    /**
     * Проверка данных, которые необходимы для работы модуля (merchantOptions, groupName)
     * @return {boolean}  true / false
     */
    init: function() {
      // Check params
      if (!settings.merchantOptions
        || !settings.merchantOptions.length
        || !settings.groupName
        || !(settings.groupName in settings.group)
        || !$(settings.layer).length) {
        var textError = 'Ошибка, работа приостановлена. ';
        if (!$(settings.layer).length) {
          methods.logOutput(textError + ' Не найден слой.');
        } else if (!settings.merchantOptions) {
          methods.logOutput(textError + ' Нет данных о merchantOptions.');
        } else {
          methods.logOutput(textError);
        }
        return false;
      } else {
        return true;
      }
    },

    /**
     * Обновление settings
     * @public
     * @param  {[object]} updateSettings Данные, необходимые для работы модуля
     * @return {boolean}  true
     */
    setNewSettings: function(updateSettings) {
      if (updateSettings) {
        $.extend(settings, updateSettings);
      }

      methods.updateMerchantOptions();
      methods.logOutput('Обновление setting');
      return true;
    },

    /**
     * Получение merchantOptions
     * @public
     * @param  {[array]}  merchantOptions   массив с информацие о платежных системах и/или системах безопасности
     */
    setMerchantOptions: function(merchantOptions) {
      settings.merchantOptions = merchantOptions;
      methods.updateMerchantOptions();
    },

    /**
     * Изменение списка MerchantOptions
     */
    updateMerchantOptions: function() {
      // Добавление к merchantOptions дополнительных значений, которые всегда должны быть. Определены в merchantOptionsAdditionally
      if (settings.merchantOptionsAdditionally.length) {
        settings.merchantOptionsAdditionally.forEach(function(item) {
          if (!~settings.merchantOptions.indexOf(item)) settings.merchantOptions.push(item);
        });
      }
      // Удаление значений из merchantOptions
      if (settings.merchantOptionsDelete.length) {
        settings.merchantOptionsDelete.forEach(function(item) {
          var key = settings.merchantOptions.indexOf(item);
          if (key) settings.merchantOptions.splice(key, 1);
        });
      }
      // Добавление значений в merchantOptions
      if (settings.merchantOptionsAdd.length) {
        settings.merchantOptionsAdd.forEach(function(item) {
          if (!~settings.merchantOptions.indexOf(item)) settings.merchantOptions.push(item);
        });
      }
      // Поиск и замена значений в merchantOptions
      if (settings.merchantOptionsChange.length) {
        settings.merchantOptionsChange.forEach(function(item) {
          var key = settings.merchantOptions.indexOf(item.search);
          if (key) settings.merchantOptions.splice(key, 1, item.change);
        });
      }
    },

    /**
     * Вывод логотипов платежных систем или систем безопасности на странице согласно merchantOptions
     * @public
     * @param  {[string]}   groupName         наименование группы, информацию о которой необходимо вывести: payment/verify
     */
    showLogos: function(groupName) {
      settings.layer = $(this);
      settings.groupName = groupName;

      // Check params
      if (!methods.init()) return false;

      // Show layer and delete another images from layer
      if (settings.imgLayerClear) {
        $(settings.layer).show().children().remove('img');
      } else {
        $(settings.layer).show();
      }

      // Add logos to layer
      var group = settings.group[settings.groupName];
      for (var i in group.list) {
        var value = group.list[i],
            name  = value.systemName.toLowerCase(),
            text  = value.text['en'] || value.systemName.replace(/_TDS$/, ''),
            version = value.version ? '?v=' + value.version : '';

        if (~settings.merchantOptions.indexOf(value.systemName)) {
          $(settings.layer).append('<img '
            + 'src="' + settings.dirImg + group.namePrefix + name + '.' + settings.imgFileExtension + version + '" '
            + 'class="' + name + '" '
            + 'height="' + value.logoHeight + '" '
            + 'alt="' + text + '" '
            + 'title="' + text + '" '
            + 'onerror="$(this).remove()">'
          );
        }
      }
    },

    /**
     * Вывод текстовой информации о платежных системах или систем безопасности на странице согласно merchantOptions
     * @public
     * @param  {[string]}   groupName         наименование группы, информацию о которой необходимо вывести: payment/verify
     * @param  {[string]}   language          язык: ru/en
     */
    showTexts: function(groupName, language) {
      if (language) settings.language = language;
      settings.layer = $(this);
      settings.groupName = groupName;

      // Check params
      if (!methods.init()) return false;

      var group    = settings.group[settings.groupName],
          arr      = [],
          textShow = '';

      // Show layer and delete everything from layer
      $(settings.layer).show().empty('');

      // Create new array width data
      group.list.forEach(function(item) {
        if (~settings.merchantOptions.indexOf(item.systemName)) {
          var text = item.text[settings.language] || item.text[settings.languageDefault];
          if (text) arr.push(text);
        }
      });

      // Check array not empty
      if (!arr.length) return false;

      // Set union
      var unionType = (settings.groupName === 'payment') ? 'and' : 'or',
          union     = settings.union[unionType][settings.language] || settings.union[unionType][settings.languageDefault];

      // Create string
      for (i in arr) {
        txt = ( (arr.length - 1) == i ) ? ' ' + union + ' ' : (i > 0) ? ', ' : '';
        textShow += txt + arr[i];
      }

      // Show string
      $(settings.layer).text(textShow);
    },

    /**
     * Вывод логов в console.
     * @param  {[string]} str   Текст для вывода в консоли браузера
     * @return {boolean}  true
     */
    logOutput: function(str) {
      if (!settings.showLog) return false;
      console.log('module PaymentSystems: ', str);
      return true;
    }
  };

  $.fn.paymentSystems = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.paymentSystems');
    }
  };
})(jQuery);