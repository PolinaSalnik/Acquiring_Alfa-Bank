if ($(document).payment && typeof $(document).payment === 'function') {
  $(document).payment({
    paramNames: ['backToShopName', 'backToShopUrl'],
    bindingCheckboxEnabled: true,
    onReady: function (session) {
      var setLanguage = 'ru';
      // Apple Pay
      if (window.ApplePaySession && ApplePaySession.canMakePayments() && ~session.merchantOptions.indexOf('APPLEPAY')) {
        $('.payment-way__apple-pay').applePay({
          paymentData: {
            mdOrder: session.mdOrder,
            currencyCode: session.currency,
            amount: session.rawAmount,
            label: session.description || ''
          },
          paymentType: 'plain',
          buttonStyle: 'black'
        }).show();
      }
      // add Samsung pay
      if (~session.merchantOptions.indexOf('SAMSUNGPAY')) {
        $('.payment-way__samsung-pay').paymentWaySamsungPay({
          orderId: session.mdOrder,
          language: setLanguage
        });
      }
      // Google Pay
      if (~session.merchantOptions.indexOf('GOOGLEPAY')) {
        $('.payment-way__google-pay').paymentWayGooglePay({
          language: setLanguage,
          environment: session.paymentSettings['googlePay.environment'] || 'TEST',
          gateway: session.paymentSettings['googlePay.gateway'] || 'rbs',
          merchantId: session.paymentSettings['googlePay.merchantId'] || '01234567890123456789',
          currency: session.currency,
          rawAmount: session.rawAmount,
          merchantFullName: session.merchantInfo.merchantFullName,
          merchantUrl: session.merchantInfo.merchantUrl,
          merchantLogin: session.merchantInfo.merchantLogin,
          orderId: session.mdOrder,
          emailRequired: true,
          phoneRequired: true
        });
      }
      // SBP.NSKP (оплата по QR)
      if (~session.merchantOptions.indexOf('SBP_C2B') && !window.payUserAgent.isMobileDevice()) {
        $('.payment-way__sbp-nspk-pay').paymentWaySbpNskpPay({
          schedulingConfig: session.paymentSettings['sbp.c2b.front.order.status.scheduling.config'],
          orderId: session.mdOrder,
          sbpC2bInfo: session.sbpC2bInfo
        });
      }
    }
  });
  $(document).ready(function() {
    $('#deactiveBindingBtn').click(function(e) {
      e.preventDefault();
      $('#modal-deactivate-binding').arcticmodal();
    });
  });
}

if ($(document).payment_binding && typeof $(document).payment_binding === 'function') {
  $(document).payment_binding({});
}
