(function () {
  function closePopup() {
    var popup = document.getElementById('noticePopup');
    if (popup) {
      popup.classList.add('hidden');
    }
  }

  function initPopup() {
    var popup = document.getElementById('noticePopup');
    if (!popup) {
      return;
    }

    var popupId = popup.getAttribute('data-popup-id');
    if (!popupId) {
      return;
    }

    var key = 'chronolab-popup-hide-' + popupId;
    var savedUntil = Number(localStorage.getItem(key) || '0');
    if (savedUntil > Date.now()) {
      return;
    }

    popup.classList.remove('hidden');

    popup.addEventListener('click', function (event) {
      var actionTarget = event.target.closest('[data-popup-action]');
      if (!actionTarget) {
        if (event.target === popup) {
          closePopup();
        }
        return;
      }

      var action = actionTarget.getAttribute('data-popup-action');
      if (action === 'hide7') {
        var sevenDays = 1000 * 60 * 60 * 24 * 7;
        localStorage.setItem(key, String(Date.now() + sevenDays));
        closePopup();
      }

      if (action === 'close' || action === 'confirm') {
        closePopup();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
})();
