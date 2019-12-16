/**
 * jQuery.moduleLoader
 * Date: 18.04.2019
 * @version 1.0
 *
 * Модуль для проверки наличия объектов/функций/библиотект в статике.
 *
 * Определяем массив объектов, которые необходимо подключить.
 * var arr = ['payUtils','payment-systems','module-3d-secure']
 * Вызываем moduleLoader.connectionCheck и передаем массив arr
 * moduleLoader.connectionCheck(arr);
 *
 * Если объекты, указанные в массиве, не подключены к статике, нужные скрипты будут загружены.
 *
 * Attention: *
 * Информация о проверяемых объектах/функциях должна быть указана settings.modules
 * Если информации о проверяемом объекте не будет в скрипте, то модуль попробует подключить файл с именем:
 * settings.dirModules + MODULE-NAME + '/jquery.' + MODULE-NAME + '.js'
 */
var moduleLoader = (function() {
  var settings = {
    dirModules: '../../modules/',
    modules: [
      {
        // Модуль с дополнительными функциями для страницы
        name: 'payUtils',
        file: '../../js/payment.utils.js',
        status: (typeof payUtils == 'object')
      }, {
        // Модуль для вывода логотипов и текстовой информации о платежных системах и системах безопасности
        name: 'payment-systems',
        file: '../../modules/payment-systems/jquery.payment-systems.js',
        status: (typeof $.fn.paymentSystems == 'function')
      }, {
        // Google Pay module
        name: 'google-pay',
        file: '../../modules/google-pay/jquery.payment.google-pay.js',
        status: (typeof $.fn.paymentWayGooglePay == 'function')
      }, {
        // Apple Pay module
        name: 'apple-pay',
        file: '../../modules/apple-pay/jquery.payment.apple-pay.js',
        status: (typeof $.fn.applePay == 'function')
      }, {
        // Samsung Pay module
        name: 'samsung-pay',
        file: '../../modules/samsung-pay/jquery.payment.samsung-pay.js',
        status: (typeof $.fn.paymentWaySamsungPay == 'function')
      }
    ]
  };

  var methods = {
    // Проверка подключения объекта / функции к статике
    // Если объект не был подключен, будет загружен скрипт
    connectionCheck: function(arr) {
      var arrayValidation = [true];
      for (var key in arr) {
        var checkModuleName = arr[key],
            checkInArray    = false,
            checkInArrayKey = '',
            checkStatus     = false,
            filename = settings.dirModules + checkModuleName + '/jquery.' + checkModuleName + '.js';
        // Ищем модуль в settings.modules
        for (var i in settings.modules) {
          var value = settings.modules[i];
          // Если информация о модуле найдена, то берем из settings.modules
          if (checkModuleName === value.name) {
            checkStatus = value.status;
            filename = value.file;
            checkInArray = true;
            checkInArrayKey = i;
            break;
          }
        }

        // Если информация о модуле не была найдена или он не подключен,
        // то подключаем JS скрипт на основе filename
        if (!checkStatus) {
          $.ajax({
            url: filename,
            async: false,
            dataType: "script",
            cache: true,
            success: function() {
              arrayValidation.push(true);
              console.warn('Module ' + checkModuleName + ' is connected.');
              // Обновляем статус в settings.modules или добавляем информацию о загруженном модуле
              // в settings.modules, чтобы модуль не загружался более 1 раза
              if (checkInArray) {
                settings.modules[checkInArrayKey].status = true;
              } else {
                settings.modules.push({
                  name: checkModuleName,
                  file: filename,
                  status: true
                });
              }
            },
            error: function() {
              arrayValidation.push(false);
              console.warn('Failed to load script ' + filename + '.');
            }
          });
        } else {
          arrayValidation.push(true);
        }
      }

      // Возвращаем результат boolean
      return validateAll = !arrayValidation.some(function(item) {
        return item === false;
      });
    }
  };

  return {
    connectionCheck: methods.connectionCheck
  }
}());
