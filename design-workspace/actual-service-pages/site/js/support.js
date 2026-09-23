(function () {
  'use strict';
  var form = document.querySelector('#support-inquiry-form');
  var statusBox = document.querySelector('[data-support-status]');
  if (!form) return;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var category = form.category.value;
    var message = form.message.value.trim();
    var subject = encodeURIComponent('[운명상회 고객센터] ' + category + ' 문의');
    var body = encodeURIComponent('이름: ' + name + '\n이메일: ' + email + '\n유형: ' + category + '\n\n' + message);
    if (statusBox) statusBox.textContent = '메일 앱을 엽니다.';
    location.href = 'mailto:axlab@crea-m.com?subject=' + subject + '&body=' + body;
  });
})();
