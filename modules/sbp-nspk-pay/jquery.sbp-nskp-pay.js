/**
 * Библиотека для проведения платежа через "Систему Быстрых Платежей"
 * (https://sbp.nspk.ru) посредством использования изображения QR кода.
 *
 * ============================
 *
 * Использование:
 *
 * // Добавляет в контейнер #sbpContainer кнопку оплаты
 * $("#sbpContainer").paymentWaySbpNskpPay({
 *    // полный список настроек см. в объекте settings
 * })
 *
 * ============================
 *
 * Стили:
 *
 * В файле стилей style.scss и style.css расположены рекомендуемые стили
 * (используется префикс заданный по умолчанию 'rbs-spb')
 *
 */
;(function ($) {
  'use strict';

  // Урл расположения скрипта
  var scriptRootUrl = (function () {
    var scripts = document.getElementsByTagName('script');
    var index = scripts.length - 1;
    var src = scripts[index].src;
    return src.split('/').slice(0, -1).join('/');
  })();

  var settings = {
    // Номер заказа (обязательная настройка!)
    orderId: null,

    // Строка расписания запросов на проверку статуса (обязательная настройка!)
    schedulingConfig: null,

    // Информация из объекта сессии о запущенном процессе оплаты через СБП
    sbpC2bInfo: null,

    // Префикс классов для создаваемых элементов
    classNamePrefix: 'rbs-sbp',

    // УРЛы API запросов
    getStatusActionUrl: '../../rest/sbp/c2b/internal/qr/status.do',
    getQrCodeActionUrl: '../../rest/sbp/c2b/internal/qr/dynamic/get.do',
    rejectPaymentActionUrl: '../../rest/sbp/c2b/internal/qr/dynamic/reject.do',
    getSessionStatusActionUrl: '../../rest/getSessionStatus.do',

    // Содержимое заголовка
    headContent: 'Оплата через Систему Быстрых Платежей',
    // Содержимое главной кнопки
    mainBtnContent: '<span style="margin-right: 8px;">Оплатить через</span>' +
      '<img src="' + scriptRootUrl + '/img/logo-sbp-clean-white.svg" style="max-width:70px; max-height: 39px;" alt="СБП">',
    // Содержимое кнопки отмены
    cancelBtnContent: 'Отменить',
    // Сообщение об ожидании завершения
    inProgressContent: 'Ожидается завершение платежа...',
    // Сообщения для кнопки запуска повторной проверки статуса
    recheckStatusBtn: 'Проверить статус',

    // Сила блюр-фильтра QR картинки
    blurRadius: 15,
  };

  // Объект состояния
  var state = {
    started: false,
    qrId: null,
    checkStatusRetries: []
  };

  var
    $container, // элемент контейнера
    $mainBtn, // элемент главной кнопки
    $modalWindow, // элемент модалки
    $qrContainer, // элемент контейнера для QR
    $qrCanvas, // элемент канваса для QR
    $cancelButton, // элемент кнопки отмены
    $modalFooter, // элемент футера модалки
    $spinnerContainer, // элемент контейнера спиннера
    checkStatusTimeoutId, // ID таймаута проверки статуса
    getPaymentStatusXhr; // ajax запрос проврки статуса (для отмены)

  // ================
  // Вспомогательные функции
  // ================

  /**
   * Экранирование текста для вставки на страницу
   * @param text - текст на вход
   */
  function escape(text) {
    text = text || '';
    return $('<div/>').text(text).html();
  }

  /**
   * Определение, что используется Internet Explorer
   */
  function isIE() {
    var ua = window.navigator.userAgent;
    return /MSIE|Trident/.test(ua);
  }

  /**
   * Формирования имени класса с учетом префикса
   * На входе список классНейм-ов ('class-name1', 'class-name2')
   * На выоходе строка 'PREFIX__class-name1 PREFIX__class-name2'
   */
  function cn() {
    var items = Array.prototype.slice.call(arguments);
    var result = '';
    $.each(items, function (idx, item) {
      result += settings.classNamePrefix + '__' + item + ' ';
    });
    return escape(result.replace(/\s&/g, ''));
  }

  /**
   * Пост-обработка ответа от сервера
   * @param data
   */
  function postProcessApiResponse(data) {
    // Проверка на наличие ошибки в ответе
    if (data.errorCode && data.errorCode !== '0') {
      return $.Deferred().reject(data)
    }
    return $.Deferred().resolve(data)
  }

  // ================
  // API-запросы
  // ================

  /**
   * Регистрация (получение) QR-кода для оплаты
   */
  function getQrCode() {
    return $.ajax({
      type: "POST",
      url: settings.getQrCodeActionUrl,
      data: JSON.stringify({
        mdOrder: settings.orderId,
        qrHeight: 10,
        qrWidth: 10,
      }),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
    }).pipe(postProcessApiResponse);
  }

  /**
   * Получить объект сессии
   */
  function getSessionStatus() {
    return $.ajax({
      type: "POST",
      url: settings.getSessionStatusActionUrl + '?MDORDER=' + settings.orderId,
      dataType: "json",
    }).pipe(postProcessApiResponse);
  }

  /**
   * Сделать запрос на отмену платежа
   */
  function rejectPayment() {
    if (!state.qrId) {
      return $.Deferred().resolve();
    }

    return $.ajax({
      type: "POST",
      url: settings.rejectPaymentActionUrl,
      data: JSON.stringify({
        mdOrder: settings.orderId,
        qrId: state.qrId,
      }),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
    }).pipe(postProcessApiResponse);
  }

  /**
   * Сделать запрос на получение статуса платежа
   */
  function getPaymentStatus() {
    getPaymentStatusXhr = $.ajax({
      type: "POST",
      url: settings.getStatusActionUrl,
      data: JSON.stringify({
        mdOrder: settings.orderId,
        qrId: state.qrId,
      }),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
    });

    return getPaymentStatusXhr.pipe(postProcessApiResponse);
  }

  // ================
  // UI-функции
  // ================

  /**
   * Показать модалку
   */
  function showModal() {
    $modalWindow.removeClass(cn('modal-window--hidden'))
  }

  /**
   * Спрятать модалку
   */
  function hideModal() {
    $modalWindow.addClass(cn('modal-window--hidden'))
  }

  /**
   * Показать в футере сообщение о прогрессе (+ запретить отмену)
   */
  function showInProgressMessage() {
    $modalFooter.empty().append('<div class="' + cn('confirmed-message') + '">' + settings.inProgressContent + '</div>')
  }

  /**
   * Показать кнопку отмены
   */
  function showCancelButton() {
    $cancelButton = $(
      '<button type="button" class="' + cn('button', 'button--cancel') + '">' +
      settings.cancelBtnContent +
      '</button>'
    );
    $modalFooter.empty().append($cancelButton);

    $cancelButton.focus();

    $cancelButton.on('click', handleCancelPayment);
  }

  /**
   * Показать спиннер поверх QR
   */
  function showSpinner() {
    $spinnerContainer.removeClass(cn('spinner-container--hidden'));
  }

  /**
   * Спрятать спиннер поверх QR
   */
  function hideSpinner() {
    $spinnerContainer.addClass(cn('spinner-container--hidden'));
  }

  /**
   * Показать сообщение об ошибке
   * @param data
   * @param defaultMessage - если в объекте нет своего сообщения
   */
  function showError(data, defaultMessage) {
    hideSpinner();

    var errorMessage = data && data.errorMessage || defaultMessage;
    var $errorMessage = $('<div class="' + cn('error-message') + '">' + escape(errorMessage) + '</div>');
    $qrContainer.empty().append($errorMessage);
  }

  /**
   * Показать кнопку для повторной проверки статуса
   */
  function showRetryButton() {
    var $retryBtn = $(
      '<button type="button" class="' + cn('button', 'button--recheck') + '">' +
      '<img src="' + scriptRootUrl + '/img/refresh.svg" class="' + cn('button-icon') + '" alt="⟳">' +
      settings.recheckStatusBtn +
      '</button>'
    );

    $retryBtn.on('click', function () {
      resetCheckStatusRetries();

      if (state.qrStatus === 'STARTED') {
        showCancelButton();
      } else if (state.qrStatus === 'CONFIRMED') {
        showSpinner();
        showInProgressMessage()
      }

      checkPaymentStatus();
    });

    $modalFooter.empty().append($retryBtn);

    $retryBtn.focus();
  }

  // ================
  // Функции основной логики
  // ================

  /**
   * Обработчик отмены оплаты
   */
  function handleCancelPayment() {
    // Блочим кнопку отмены
    $modalWindow.find('.' + cn('button--cancel')).prop('disabled', true);

    // Отменяем последний запрос на проверку статуса
    if (getPaymentStatusXhr) {
      getPaymentStatusXhr.abort();
    }

    // Отменяем таймер проверок оплаты
    if (checkStatusTimeoutId) {
      clearTimeout(checkStatusTimeoutId);
    }

    // Делаем отмену по запросу
    rejectPayment()
      .done(function (data) {
        // Прячем модалку
        hideModal();
      })
      .fail(function (data) {
        showError(data, 'Не удалось отменить процесс оплаты');
      })
  }

  /**
   * Произвести редирект после проведения платежа
   */
  function doFinishRedirect() {
    // Получаем ссылку на редирект через getSessionStatus
    getSessionStatus()
      .done(function (data) {
        if (data.redirect) {
          document.location.href = data.redirect;
          return;
        }

        // Не пришла ссылка на редирект? Такого не должно быть - перезагружаем страницу
        document.location.reload();
      }).fail(function () {
      document.location.reload();
    })
  }

  /**
   * Показать процесс индикации процесса платежа (после того как QR считан)
   * Задача - скрыть QR, чтоб пользователь не считал его второй раз
   */
  function showConfirmedIndication() {
    var confirmedClassName = cn('qr-container--confirmed');

    if (!$qrContainer.is('.' + confirmedClassName)) {
      $qrContainer.addClass(confirmedClassName);
      var ctx = $qrCanvas[0].getContext("2d");

      // Блюрим картинку
      if (isIE()) {
        // Для IE блюрим скриптом
        if (window.stackBlurCanvasContext) {
          window.stackBlurCanvasContext(ctx, settings.blurRadius);
        } else {
          $.getScript(scriptRootUrl + '/' + 'canvas-blur.js', function () {
            window.stackBlurCanvasContext(ctx, settings.blurRadius);
          });
        }
      } else {
        // Для остальных применяем CSS
        $qrCanvas.css('filter', 'blur(' + settings.blurRadius / 2 + 'px)');
      }

      showSpinner();
      showInProgressMessage()
    }
  }

  /**
   * Выполнить единичную проверку состояния платежа с задержкой по расписанию
   */
  function checkPaymentStatus() {
    var tryDelay = state.checkStatusRetries.shift();

    if (tryDelay !== undefined) {
      // Делаем проверку через указанное время
      checkStatusTimeoutId = setTimeout(function () {
        getPaymentStatus()
          .done(function (data) {

            state.qrStatus = data.qrStatus;

            // В зависимости от пришедшего статуса
            switch (data.qrStatus) {
              // Пользователь еще не считал QR код
              case "STARTED":
                // Будем проверять еще
                checkPaymentStatus();
                break;

              // Пользовал сосканил код, но платеж еще не произвел,
              case "CONFIRMED":
                // Выводим индикацию, что оплата идет (скрываем QR с экрана)
                showConfirmedIndication();
                // Будем проверять еще
                checkPaymentStatus();
                break;

              // Платеж отменен пользователем
              case "REJECTED_BY_USER":
                hideModal();
                break;

              // Получен статус о завершении
              case "REJECTED":
              case "ACCEPTED":
                // Делаем финальный редирект
                doFinishRedirect();
                break;
            }
          })
          .fail(function () {
            // В случае ошибки - просто продолжаем дальнейший опрос
            checkPaymentStatus();
          })
      }, tryDelay)
    } else {
      showRetryButton();
    }
  }

  /**
   * Показать QR для оплаты
   * @param options
   */
  function startPayment(options) {

    var qrId = options.qrId;
    var qrStatus = options.qrStatus;
    var renderedQr = options.renderedQr;

    state.qrId = qrId;
    state.qrStatus = qrStatus;

    $qrCanvas = $('<canvas width="300" height="300">');
    $qrContainer.empty().append($qrCanvas);

    var ctx = $qrCanvas[0].getContext("2d");
    if (ctx.imageSmoothingEnabled !== undefined) {
      ctx.imageSmoothingEnabled = false;
    } else if (ctx.webkitImageSmoothingEnabled !== undefined) {
      ctx.webkitImageSmoothingEnabled = false;
    } else if (ctx.mozImageSmoothingEnabled !== undefined) {
      ctx.mozImageSmoothingEnabled = false;
    } else if (ctx.msImageSmoothingEnabled !== undefined) {
      ctx.msImageSmoothingEnabled = false;
    } else if (ctx.oImageSmoothingEnabled !== undefined) {
      ctx.oImageSmoothingEnabled = false;
    }

    var image = new Image();
    image.onload = function () {
      ctx.drawImage(image, 0, 0, 300, 300);
    };
    image.src = 'data:image/png;base64,' + renderedQr;

    // Начинаем дергать сервер для проверки статуса платежа
    resetCheckStatusRetries();
    checkPaymentStatus();

    if (qrStatus === 'CONFIRMED') {
      showConfirmedIndication();
    } else {
      hideSpinner();
    }
  }

  /**
   * Начало платежа (нажатие кнопки оплаты)
   */
  function handleClickMainButton() {
    $qrContainer.empty().text('Загрузка...');
    $cancelButton.prop('disabled', true);

    showModal();

    getQrCode()
      .done(function (data) {
        startPayment({
          qrId: data.qrId,
          qrStatus: 'STARTED',
          renderedQr: data.renderedQr,
        })


      })
      .fail(function (data) {
        showError(data, 'Не удалось получить QR-код для оплаты');
      })
      .always(function () {
        $cancelButton.prop('disabled', false);
      })
  }

  /**
   * Сбросить состояние расписания проверок
   */
  function resetCheckStatusRetries() {
    state.checkStatusRetries = [];

    // Конвертим строку расписания в массив попыток (с кол-вом миллисекунд)
    $.each(settings.schedulingConfig.split(','), function (idx, item) {
      state.checkStatusRetries.push(Number(item) * 1000);
    });
  }

  /**
   * Инициализация
   * @param options - параметры инициализации
   */
  function init(options) {
    if ($("." + settings.classNamePrefix + '__main-button').length !== 0) {
      throw new Error('Повторная инициализация модуля оплаты')
    }

    // Дополняем настройки settings пришедшими свойствами
    for (var key in options) {
      settings[key] = options[key];
    }

    //
    // Проверка наличия необходимых параметров
    //

    var missedSettings = [];
    $.each(['schedulingConfig', 'orderId'], function (idx, item) {
      if (!settings[item]) {
        missedSettings.push(item);
      }
    });

    if (missedSettings.length) {
      console.error('Не определены необходимые настройки ' + JSON.stringify(missedSettings));
      return;
    }

    //
    // Генерация содержимого
    //

    // Создаем кнопку
    generateMainButton();
    $container.append($mainBtn);

    // Создаем модалку
    generateModalWindow();

    // Модалку монтируем отдельно, чтоб не влияли стили родителей
    $('body').append($modalWindow);

    // Показываем родительский контейнер
    $container.show();

    // Если был уже запущен процесс оплаты через СБП
    if (settings.sbpC2bInfo) {
      startPayment({
        qrId: settings.sbpC2bInfo.qrId,
        qrStatus: settings.sbpC2bInfo.status,
        renderedQr: settings.sbpC2bInfo.renderedQr,
      });

      showModal();
    }

    return {
      // Убрать кнопку со страницы
      destroy: function () {
        $mainBtn.remove();
        $modalWindow.remove();
      }
    }
  }

  /**
   * Генерация элемента кнопки
   */
  function generateMainButton() {
    $mainBtn = $('<button class="button ' + cn('main-button') + '" type="button">' +
      settings.mainBtnContent +
      '</button>');

    $mainBtn.on('click', handleClickMainButton);
  }

  /**
   * Генерация модального окна с отображением QR кода
   */
  function generateModalWindow() {
    var isIeClassName = isIE() ? 'ie ' : '';
    var template = '<div class="' + isIeClassName + cn('modal-window', 'modal-window--hidden') + '">' +
      '<div class="' + cn('modal-window-inner') + '">' +
      '<div class="' + cn('modal-head') + '">' +
      settings.headContent +
      '</div>' +
      '<div class="' + cn('modal-content') + '">' +
      '<div class="' + cn('spinner-container', 'spinner-container--hidden') + '"><div class="' + cn('spinner') + '"></div></div>' +
      '<div class="' + cn('qr-container') + '">' +
      '</div>' +
      '</div>' +
      '<div class="' + cn('modal-footer') + '">' +
      '</div>' +
      '</div>' +
      '</div>';

    $modalWindow = $(template);

    $qrContainer = $modalWindow.find('.' + cn('qr-container'));
    $cancelButton = $modalWindow.find('.' + cn('button--cancel'));
    $modalFooter = $modalWindow.find('.' + cn('modal-footer'));
    $spinnerContainer = $modalWindow.find('.' + cn('spinner-container'));

    showCancelButton();

    return $modalWindow;
  }

  $.fn.paymentWaySbpNskpPay = function (options) {
    $container = $(this);
    return init(options);
  };
})(window.jQuery);
