$(document).ready(function() {
  $('#pan_sub').bind('input keyup', correctCardNumber);

  function correctCardNumber (event) {
    var delimiter = ' ',
      target = event.target,
      position = target.selectionEnd,
      length = target.value.length;

    target.value = target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1' + delimiter).trim();
    target.selectionEnd = position += ((target.value.charAt(position - 1) === ' ' &&
    target.value.charAt(length - 1) === ' ' && length !== target.value.length) ? delimiter.length : 0);

    $('#pan').val(target.value.replace(/[^\d]/g, ''));
  }
});