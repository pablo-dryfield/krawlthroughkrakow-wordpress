
document.addEventListener('DOMContentLoaded', function () {
  // Divi default header toggle button
  var legacyBtn = document.querySelector('.et_mobile_nav_menu .mobile_menu_bar');

  // Divi Theme Builder Menu module toggle button
  var builderBtn = document.querySelector('.et_pb_menu__toggle');

  function makeInstant(btn){
    if (!btn) return;
    btn.addEventListener('pointerdown', function(e){
      // Trigger Divi's click immediately on touch; don't add custom classes
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        btn.click();
        e.preventDefault(); // avoid double toggles
      }
    }, {passive:false});
  }

  makeInstant(legacyBtn);
  makeInstant(builderBtn);
});
