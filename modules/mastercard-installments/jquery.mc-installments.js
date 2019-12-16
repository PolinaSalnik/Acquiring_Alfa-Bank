/**
 * Библиотека для проведения платежа "Рассрочку MasterCard"
 *
 * ============================
 *
 * Использование:
 *
 * // Добавляет в контейнер #sbpContainer кнопку оплаты
 * $("#mcInstallmentsContainer").paymentWayMastercardInstallments({
 *    // полный список настроек см. в объекте settings
 * })
 *
 * ============================
 *
 * Стили:
 *
 * В файле стилей style.scss и style.css расположены рекомендуемые стили
 * (используется префикс заданный по умолчанию 'rbs-mc-installments')
 *
 */
;(function ($) {
  'use strict';

  // Урл расположения скрипта
  var scriptRootUrl = (function () {
    var scripts = document.getElementsByTagName('script');
    var index = scripts.length - 1;
    var src = scripts[index].src;
    return src
      .split('/')
      .slice(0, -1)
      .join('/');
  })();

  // Настройки модуля
  var settings = {
    // Номер заказа (обязательная настройка!)
    orderId: null,
    // Сумма заказа в копейках
    amount: null,
    // Сумма заказа в нормальном виде
    amountRaw: null,
    // Валюта
    currency: null,

    // Префикс классов для создаваемых элементов
    classNamePrefix: 'rbs-mc-installments',

    // Имя класса для полей дополнительн с доп. значениям jsonParams
    paramPrefix: 'additional-param',

    // УРЛы API запросов
    checkBinRangesActionUrl: '../../installment-proxy/binranges/check',
    getInstallmentsProposalsActionUrl: '../../installment-proxy/installments/get',

    // Селекторы элементов основной страницы для получения данных для проведения платежа
    cardNumberInputSelector: '#pan_sub',
    bindingIdSelectSelector: '#bindingId',
    bindingMaskedPanSelector: '#maskedPan',
    bindingFormSelector: '#formBinding',
    cardCvcInputSelector: '#cvc',
    cardExpiryMonthInputSelector: '#month',
    cardExpiryYearInputSelector: '#year',
    cardHolderNameInputSelector: '#cardholder',
    buttonPaymentSelector: '#buttonPayment',

    partnerHeadLogoUrl: {
      ru: '',
      en: ''
    },
    masterCardHeadLogoUrl: scriptRootUrl + '/img/mc_hrz_pos.svg',

    // Надписи
    mainBtnContent: {
      ru: 'Программа рассрочки',
      en: 'MasterCard Installments'
    },
    agreeOfferLabelContent: {
      ru: 'Ознакомлен и согласен',
      en: 'I have read and agree'
    },
    proposalListTitleContent: {
      ru: 'Выберите количество месяцев для рассрочки:',
      en: 'Choose the number of months for installments:'
    },
    installmentsDetailTitleContent: {
      ru: 'Расчет по рассрочке:',
      en: 'Payment by installments:'
    },
    contractOfferTitleContent: {
      ru: 'Договор оферты',
      en: 'Contract offer'
    },
    stepContent: {
      ru: 'Шаг {X} из {Y}',
      en: 'Step {X} of {Y}'
    },
    nextButtonLabelContent: {
      ru: 'Далее',
      en: 'Next'
    },
    prevButtonLabelContent: {
      ru: 'Назад',
      en: 'Back'
    },
    submitButtonLabelContent: {
      ru: 'Оплата',
      en: 'Submit'
    },
    monthTitlesContent: {
      ru: ['месяц', 'месяца', 'месяцев'],
      en: ['month', 'months', 'months']
    },
    installmentsCountLabelContent: {
      ru: 'Количество месяцев',
      en: 'Number of months'
    },
    transactionAmountLabelContent: {
      ru: 'Сумма покупки',
      en: 'Purchase amount'
    },
    firstInstallmentAmountLabelContent: {
      ru: 'Сумма первого платежа',
      en: 'Amount of the first payment'
    },
    subSeqInstallmentAmountLabelContent: {
      ru: 'Сумма последующих платежей',
      en: 'Amount of subsequent payments'
    },
    interestRateLabelContent: {
      ru: 'Годовая процентная ставка',
      en: 'Annual interest rate'
    },
    installmentFeeLabelContent: {
      ru: 'Комиссия за рассрочку',
      en: 'Installment Commission'
    },
    annualRateLabelContent: {
      ru: 'Стоимость кредита',
      en: 'Loan cost'
    },
    totalAmountLabelContent: {
      ru: 'Итоговая сумма выплат по рассрочке',
      en: 'Total installment payments'
    },
    noProposalsContent: {
      ru: 'К сожалению, для вас нет подходящих вариантов рассрочки.',
      en: 'Unfortunately, there are no suitable installment options for you.'
    },
    returnButtonContent: {
      ru: 'Вернуться к другим способам оплаты',
      en: 'Return to other payment methods'
    },
    contractOfferMainTextContent: {
      ru: '',
      en: ''
    }
  };

  // Объект состояния
  var state = {
    installmentsProposals: null,
    activeProposal: null,
    activeProposalIdx: null,
    cardNumber: ''
  };

  var $container, $mainBtn, $modalWindow, $content; // элемент контейнера

  // ================
  // Вспомогательные функции
  // ================

  /**
   * Экранирование текста для вставки на страницу
   * @param text - текст на вход
   */
  function escape(text) {
    text = text || '';
    return $('<div></div>')
      .text(text)
      .html();
  }

  /**
   * Определение, что используется Internet Explorer
   */
  function isIE() {
    var ua = window.navigator.userAgent;
    return /MSIE|Trident/.test(ua);
  }

  function getContent(contentKey) {
    var language = settings.language;
    return settings[contentKey][language]
  }

  function getStepContent(current, total) {
    var contractOfferTextExist = !!getContent('contractOfferMainTextContent');
    total = total || (contractOfferTextExist ? 3 : 2);
    return getContent('stepContent').replace('{X}', current).replace('{Y}', total);
  }

  /**
   * Склонение множеств
   * @param number
   * @param titles
   * @returns {*}
   */
  function declOfNum(number, titles) {
    var cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  }

  /**
   * Отобразить значение суммы с наименованием валюты
   * @param value
   * @param currency
   * @returns {string}
   */
  function formatValueCurrency(value, currency) {
    if (settings.language === 'ru' && currency === 'RUB') {
      return value + ' руб.'
    } else if (currency === 'USD') {
      return '$' + value;
    } else {
      return value + ' ' + currency;
    }
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
    // Проверка что ответ успешный
    if (!data.success) {
      if (data.description) {
        console.warn(data.description);
      }
      return $.Deferred().reject(data);
    }
    return $.Deferred().resolve(data);
  }

  // ================
  // API-запросы
  // ================

  /**
   * Получить объект сессии
   */
  function checkBin() {
    return $.ajax({
      type: 'POST',
      url: settings.checkBinRangesActionUrl,
      data: JSON.stringify({
        bin: state.cardNumber.slice(0, 6)
      }),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    }).pipe(postProcessApiResponse)
      .done(function (data) {
        state.checkBinResult = data.checkResult;
        updateMainButtonStatus();
      });
  }

  /**
   * Сделать запрос на получение статуса платежа
   */
  function getInstallmentsProposals() {
    return $.ajax({
      type: 'POST',
      url: settings.getInstallmentsProposalsActionUrl,
      data: JSON.stringify({
        primaryAccountNumber: state.cardNumber,
        currencyCode: settings.currency,
        transactionAmount: settings.amount,
        mdOrder: settings.orderId
      }),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .pipe(postProcessApiResponse)
      .done(function (data) {
        state.installmentsProposals = data.installmentsProposals;
        state.receiptFreeText = data.receiptFreeText;
      })
      .fail(function(data){
        state.installmentsProposals = [];
      });
  }

  /**
   * Проведение оплаты через рассрочку
   * @returns {*}
   */
  function processInstallments(){
    state.processInstallmentsInProgress = true;

    // Показываем спиннер на момент оплаты
    showFullSpaceInnerLoader();


    $('#mc-installments-additional-params').remove();
    var $additionalParams = $('<div style="display: none;" id="mc-installments-additional-params"></div>');
    Object.keys(state.activeProposal).forEach(function(key){
      $additionalParams.append($('<input class="'+settings.paramPrefix+'" name="'+key+'" value="'+state.activeProposal[key]+'">'));
    });
    $additionalParams.append($('<input class="'+settings.paramPrefix+'" name="receiptFreeText" value="'+state.receiptFreeText+'">'));
    $('body').append($additionalParams);

    hideModal();
    $(settings.buttonPaymentSelector).click();
  }

  // ================
  // UI-функции
  // ================

  /**
   * Показать модалку
   */
  function showModal() {
    $modalWindow.removeClass(cn('modal-window--hidden'));
    var $html = $('html');
    state.originalBodyOverflow = $html.css('overflow');
    $html.css('overflow', 'hidden');
  }

  /**
   * Спрятать модалку
   */
  function hideModal() {
    // Если уже в процессе оплаты, то закрыть нельзя
    if(state.processInstallmentsInProgress){
      return;
    }

    $modalWindow.addClass(cn('modal-window--hidden'));
    $('html').css('overflow', state.originalBodyOverflow);

    resetState();
  }

  /**
   * Создание модального окна с отображением визарда
   */
  function createModalWindow() {
    var isIeClassName = isIE() ? 'ie ' : '';
    var template = '<div class="' + isIeClassName + cn('modal-window', 'modal-window--hidden', 'modal-window--mono') + '">' +
      '<div class="' + cn('modal-window-head') + '">' +
      '<div class="' + cn('head-left') + '">' +
      '<img src="' + settings.partnerHeadLogoUrl[settings.language] + '" alt="bank" class="' + cn('head-logo', 'partner-head-logo') + '">' +
      '</div>' +
      '<div class="' + cn('head-separator') + '"></div>' +
      '<div class="' + cn('head-right') + '">' +
      '<img src="' + settings.masterCardHeadLogoUrl + '" alt="mastercard" class="' + cn('head-logo') + '">' +
      '</div>' +
      '<div class="' + cn('close-button-container') + '">' +
      '<button class="' + cn('close-button') + '">' +
      '<img src="' + scriptRootUrl + '/img/cross.svg' + '" title="'+getContent('returnButtonContent')+'" alt="x">' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="' + cn('space-filler') + '"></div>' +
      '<div class="' + cn('modal-window-inner') + '">' +
      '<div class="' + cn('content') + '">' +
      '</div>' +
      '</div>' +
      '<div class="' + cn('return-container') + '">' +
      '<button class="' + cn('return-button') + '">' + getContent('returnButtonContent') + '</button>' +
      '</div>' +
      '<div class="' + cn('space-filler', 'space-filler--bottom') + '"></div>' +
      '</div>';

    $modalWindow = $(template);
    $content = $modalWindow.find('.' + cn('content'));

    $modalWindow.find('.' + cn('return-button') + ', .' + cn('close-button')).on('click', function () {
      hideModal();
    });

    // Модалку монтируем отдельно, чтоб не влияли стили родителей
    $('body').append($modalWindow);
  }

  /**
   * Генерация элемента кнопки
   */
  function createMainButton() {
    $mainBtn = $(
      '<button class="button ' + cn('main-button') + '" type="button">' +
      getContent('mainBtnContent') +
      '<img src="'+scriptRootUrl + '/img/mc_hrz_pos.svg'+'">'+
      '</button>'
    );

    $mainBtn.on('click', handleClickMainButton);

    $container.append($mainBtn);
  }

  function showFullSpaceInnerLoader() {
    $content.empty().append('<div class="' + cn('spinner-container') + '"><div class="' + cn('spinner') + '"></div></div>');
  }

  /**
   * Показать представление выбора периода
   */
  function showPeriodSelectionView() {
    function renderContent() {
      $content.empty();

      if(state.installmentsProposals.length){
        $content.append(
          '<div class="' + cn('modal-title') + '">' + getContent('proposalListTitleContent') + '</div>' +
          '<div class="' + cn('modal-main', 'modal-main--center') + '">' +
          // Списк для выбора прдолжительности рассрочки
          '<div class="' + cn('proposal-list') + '">' +
          state.installmentsProposals.reduce(function (result, proposal, idx) {
            var id = 'installmentsCount' + proposal.installmentsCount;
            var labelText = declOfNum(proposal.installmentsCount, getContent('monthTitlesContent'));
            result +=
              '<div class="' + cn('proposal-list-item') + '">' +

              '<input name="installmentsCount" type="radio" id="' + id + '" ' +
              'value="' + idx + '" class="' + cn('radio') + '" ' + (state.activeProposalIdx === idx ? 'checked ' : '') + '>' +

              '<label for="' + id + '">' + proposal.installmentsCount + ' ' + labelText + '</label>' +
              '</div>';
            return result;
          }, '') +
          '</div>' +
          '</div>' +
          '<div class="' + cn('modal-footer') + '">' +
          '<div class="' + cn('modal-buttons') + '">' +
          '<button class="' + cn('next-button') + '" ' + (state.activeProposalIdx === null ? 'disabled ' : '') + '>' + getContent('nextButtonLabelContent') + '</button>' +
          '</div>' +
          '<div class="' + cn('step-counter') + '">' + getStepContent(1) + '</div>' +
          '</div>'
        );
      } else {
        $content.append('<div class="no-proposals">' + getContent('noProposalsContent') + '</div>');
      }


      var $nextButton = $content.find('.' + cn('next-button'));

      $nextButton.on('click', function () {
        showInstallmentsDetailScreen()
      });

      $content.find('[name=installmentsCount]').on('click', function () {
        var value = Number($(this).val());
        state.activeProposal = state.installmentsProposals[value];
        state.activeProposalIdx = value;
        $nextButton.attr('disabled', false);
      });

      $content.find('[name=installmentsCount]').first().focus();
    }

    // Если условия ранее не были получены
    if (!state.installmentsProposals) {
      showFullSpaceInnerLoader();

      getInstallmentsProposals()
        .always(renderContent)
    } else {
      renderContent();
    }
  }

  /**
   * Показать представление с условиями рассрочки
   */
  function showInstallmentsDetailScreen(back) {
    function renderItemLabel(itemKey) {
      var activeProposal = state.activeProposal;
      return getContent(itemKey + 'LabelContent') + ': ';
    }

    function renderItemValue(itemKey, type) {
      var activeProposal = state.activeProposal;

      var value = activeProposal[itemKey];
      if(type === 'amount' || type === 'percent'){
        value = (Number(value) / 100).toFixed(2);
      }

      switch (type) {
        case 'amount': {
          value = formatValueCurrency(value, state.activeProposal.currencyCode);
          break;
        }
        case 'percent': {
          value = value + '%';
          break;
        }
      }

      return value;
    }

    var contractOfferTextExist = !!getContent('contractOfferMainTextContent');

    $content.empty().append(
      '<div class="' + cn('modal-title') + '">' + getContent('installmentsDetailTitleContent') + '</div>' +
      '<div class="' + cn('modal-main', 'modal-main--center') + '">' +
      '<div class="' + cn('proposal-details') + '">' +
      '<table><tbody>' +
      '<tr><td colspan=2>' + renderItemLabel('installmentsCount') + renderItemValue('installmentsCount') + '</td></tr>' +
      '<tr><td colspan=2 class="' + cn('table-separator') + '"></td></tr>' +
      '<tr><td>' + renderItemLabel('transactionAmount') + '</td><td>' + renderItemValue('transactionAmount', 'amount') + '</td></tr>' +
      '<tr><td>' + renderItemLabel('firstInstallmentAmount') + '</td><td>' + renderItemValue('firstInstallmentAmount', 'amount') + '</td></tr>' +
      '<tr><td>' + renderItemLabel('subSeqInstallmentAmount') + '</td><td>' + renderItemValue('subSeqInstallmentAmount', 'amount') + '<br></td></tr>' +
      '<tr><td colspan=2 class="' + cn('table-separator') + '"></td></tr>' +
      '<tr><td>' + renderItemLabel('interestRate') + '</td><td>' + renderItemValue('interestRate', 'percent') + '</td></tr>' +
      '<tr><td>' + renderItemLabel('installmentFee') + '</td><td>' + renderItemValue('installmentFee', 'amount') + '</td></tr>' +
      '<tr><td>' + renderItemLabel('annualRate') + '</td><td>' + renderItemValue('annualRate', 'percent') + '</td></tr>' +
      '<tr><td colspan=2><hr></td></tr>' +
      '<tr><td>' + renderItemLabel('totalAmount') + '</td><td>' + renderItemValue('totalAmount', 'amount') + '</td></tr>' +
      '</tbody></table>' +
      '</div>' +
      '</div>' +
      '<div class="' + cn('modal-footer') + '">' +
      '<div class="' + cn('modal-buttons') + '">' +
      '<button class="' + cn('prev-button') + '">' + getContent('prevButtonLabelContent') + '</button>' +
      (contractOfferTextExist ?
          '<button class="' + cn('next-button') + '">' + getContent('nextButtonLabelContent') + '</button>' :
          '<button class="' + cn('next-button', 'confirm-button') + '">' + getContent('submitButtonLabelContent') + '</button>'
      ) +
      '</div>' +
      '<div class="' + cn('step-counter') + '">' + getStepContent(2) + '</div>' +
      '</div>'
    );

    $content.find('.' + cn('next-button')).on('click', function () {
      showContractOfferScreen()
    });

    $content.find('.' + cn('confirm-button')).on('click', function () {
      processInstallments();
    });

    $content.find('.' + cn('prev-button')).on('click', function () {
      showPeriodSelectionView()
    });

    if (back) {
      $content.find('.' + cn('prev-button')).focus();
    } else {
      $content.find('.' + cn('next-button')).focus();
    }
  }

  /**
   * Показать представление с договором оферты
   */
  function showContractOfferScreen() {
    $content.empty().append(
      '<div class="' + cn('modal-title') + '">' + getContent('contractOfferTitleContent') + '</div>' +
      '<div class="' + cn('modal-main') + '">' +
      '<div class="' + cn('offer-text') + '">' + getContent('contractOfferMainTextContent') + '</div>' +

      '</div>' +
      '<div class="' + cn('modal-footer') + '">' +
      '<div class="' + cn('agree-container') + '">' +

      '<label for="agreeOffer" class="' + cn('checkbox-label') + '">' +
      '<input type="checkbox" id="agreeOffer" class="' + cn('checkbox') + '" />' +
      '<span class="' + cn('checkbox-decor') + '"></span>' +
      '<span class="' + cn('checkbox-text') + '">' + getContent('agreeOfferLabelContent') + '</span>' +
      '</label>' +

      '</div>' +
      '<div class="' + cn('modal-buttons') + '">' +
      '<button class="' + cn('prev-button') + '">' + getContent('prevButtonLabelContent') + '</button>' +
      '<button class="' + cn('next-button', 'confirm-button') + '" disabled>' + getContent('submitButtonLabelContent') + '</button>' +
      '</div>' +
      '<div class="' + cn('step-counter') + '">' + getStepContent(3) + '</div>' +
      '</div>');

    var $confirmButton = $content.find('.' + cn('confirm-button'));

    $content.find('#agreeOffer').on('change', function () {
      var checked = $("#agreeOffer").prop('checked');
      $confirmButton.attr('disabled', !checked);
    });

    $confirmButton.on('click', function () {
      processInstallments();
    });

    $content.find('.' + cn('prev-button')).on('click', function () {
      showInstallmentsDetailScreen(true)
    });

    $content.find('#agreeOffer').focus();
  }

  // ================
  // Функции основной логики
  // ================

  /**
   * Сброс состояния
   */
  var resetState = (function (defaultState) {
    return function(){
      var checkBinResult = state.checkBinResult;
      var cardNumber = state.cardNumber;
      state = $.extend({}, defaultState);

      state.cardNumber = cardNumber;
      state.checkBinResult = checkBinResult;
    }
  })($.extend({}, state));

  /**
   * Обновить статус главной платежной кнопки
   */
  function updateMainButtonStatus() {

    // Если кратой можно платить через рассрочку - показываем кнопку вызова окна оплаты
    if (state.checkBinResult) {
      $mainBtn.removeClass(cn('main-button--hidden'));
    } else {
      $mainBtn.addClass(cn('main-button--hidden'));
    }

    if($(settings.buttonPaymentSelector).attr('disabled')){
      $mainBtn.attr('disabled', true);
    } else {
      $mainBtn.attr('disabled', false);

      if(state.processInstallmentsInProgress){
        // Если после оплаты вдруг кнопка оплаты снова стало активной
        // вероятно там ошибка - прячем модалку, чтоб было видно ошибку
        state.processInstallmentsInProgress = false;
        hideModal();
      }
    }

    // ДЛЯ ДЕБАГА - ПОКАЗАТЬ ВСЕГДА
    // $mainBtn.removeClass(cn('main-button--hidden'));
    // $mainBtn.attr('disabled', false);
  }

  /**
   * Начало платежа (нажатие кнопки оплаты)
   */
  function handleClickMainButton() {
    if(!$(settings.buttonPaymentSelector).attr('disabled')){
      showModal();
      showPeriodSelectionView();
    }
  }

  function checkBinding(){
    if($(settings.bindingFormSelector).is(":visible")){
      var bindingLabel = $(settings.bindingIdSelectSelector).find('option:selected').text();
      state.cardNumber = bindingLabel.slice(0, 6);
      checkBin();
    } else {
      // Если перешли к ручному вводу
      checkRawCardInput();
    }
  }

  function checkRawCardInput(){
    if (!$(settings.cardNumberInputSelector).length) {
      return;
    }

    var value = $(settings.cardNumberInputSelector).val().replace(/\s/g, '');
    // Только если поменялись первые 6 цифр номера карты
    if (value.length >= 6){
      if (state.cardNumber.slice(0, 6) !== value.slice(0, 6)) {
        state.cardNumber = value;
        checkBin();
      }
    } else {
      state.checkBinResult = false;
    }

    state.cardNumber = value;
    updateMainButtonStatus();
  }

  /**
   * Инициализация
   * @param options - параметры инициализации
   */
  function init(options) {
    if ($('.' + settings.classNamePrefix + '__main-button').length !== 0) {
      throw new Error('Повторная инициализация модуля оплаты mastercard-installments');
    }

    // Дополняем настройки settings пришедшими свойствами
    for (var key in options) {
      settings[key] = options[key];
    }

    // Получаем сумму в копейках
    if (!settings.amount && settings.rawAmount) {
      settings.amount = Number(settings.rawAmount) * 100;
    }

    //
    // Проверка наличия необходимых параметров
    //

    var missedSettings = [];
    $.each(['amount', 'orderId', 'currency'], function (idx, item) {
      if (!settings[item]) {
        missedSettings.push(item);
      }
    });

    if (missedSettings.length) {
      console.error('Не определены необходимые настройки ' + JSON.stringify(missedSettings));
      return;
    }

    //
    // Ловим изменения параметров карты оплаты с основной страницы
    //

    if ($(settings.cardNumberInputSelector).length) {
      $(settings.cardNumberInputSelector).on('input', checkRawCardInput);
    }

    if ($(settings.bindingFormSelector).length) {
      $(settings.bindingFormSelector).on('change', checkBinding);
    }

    $(settings.buttonPaymentSelector).bind("DOMSubtreeModified",function(){
      updateMainButtonStatus();
    });

    // При изменении состояния главной кнопки оплаты
    if ($(settings.buttonPaymentSelector).length) {
      var observerPayButton = new MutationObserver(function () {
        updateMainButtonStatus();
      });
      observerPayButton.observe($(settings.buttonPaymentSelector)[0], {
        attributes: true,
        attributeFilter: ['disabled']
      });
    }

    // При изменении состояния выбора биндинга
    if ($(settings.bindingFormSelector).length) {
      var observerFormBinding = new MutationObserver(function () {
        checkBinding();
      });
      observerFormBinding.observe($(settings.bindingFormSelector)[0], {
        attributes: true
      });
    }


    //
    // Генерация содержимого
    //

    createMainButton();
    createModalWindow();

    checkBinding();

    // Если биндинг жестко задан
    if($(settings.bindingMaskedPanSelector).length){
      if($(settings.bindingMaskedPanSelector).is(':visible')){
        state.cardNumber = $(settings.bindingMaskedPanSelector).text().replace(/\D/g, '').slice(0, 6);
        checkBin();
      }
    }

    updateMainButtonStatus();

    $container.show();
  }

  $.fn.paymentWayMastercardInstallments = function (options) {
    $container = $(this);
    return init(options);
  };
})(window.jQuery);
