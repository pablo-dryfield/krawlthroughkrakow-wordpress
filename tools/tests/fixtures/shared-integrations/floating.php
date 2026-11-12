add_action('wp_footer', function(){ ?>
  <!-- Floating CTA -->
  <a id="ktk-cta" class="js-fh-book"
     href="https://krawlthroughkrakow.com/store2/pub-crawl-28/#book">
     BOOK NOW
  </a>

  <style>
    /* Desktop: vertical tab on the right edge */
    #ktk-cta{
      position:fixed; right:20px; top:25%;
      transform:translateY(-50%) rotate(-90deg);
      transform-origin:right center;
      z-index:100000;
      background:#000; color:#fff; text-decoration:none;
	  border-width: 5px;
	  border-color: white;
      padding:12px 16px; border-radius:8px;
      font-weight:700; letter-spacing:.5px; text-transform:uppercase;
	  font-size: 30px;
      box-shadow:0 8px 20px rgba(0,0,0,.25);
    }
    #ktk-cta:hover{ opacity:.9; }

    /* Mobile: bottom pill 
    @media (max-width: 767px){
      #ktk-cta{
        transform:none; right:16px; left:16px;
		top:auto; bottom:16px; border-radius:999px; text-align:center;
      }
    }*/
  </style>
  <script>
(function(){

  /* Hide CTA on any URL that starts with /store or is exactly /store */
  function toggleCTA(){
    var path = location.pathname.replace(/\/+$/, '');
    var hide = (path === '/store' || path.startsWith('/store/') || path.startsWith('/store2') || path.startsWith('/store2/'));
    var el = document.getElementById('ktk-cta');
    if (el) el.style.display = hide ? 'none' : '';
  }

  /* Change CTA link on New Year's Eve page */
  function setNYELink(){
    var path = location.pathname.replace(/\/+$/, '');
    var cta = document.getElementById('ktk-cta');
    if (!cta) return;

    if (path === '/new-years-eve' || path.startsWith('/new-years-eve/')) {
      cta.href = "https://krawlthroughkrakow.com/store/New-Years-Eve-Krakow-Pub-Crawl-p800134329";
    }
  }

  /* Run on load */
  toggleCTA();
  setNYELink();

  /* Re-run on SPA-like navigation */
  window.addEventListener('hashchange', function(){
    toggleCTA();
    setNYELink();
  });

  ['pushState','replaceState'].forEach(function(method){
    var orig = history[method];
    history[method] = function(){
      var result = orig.apply(this, arguments);
      setTimeout(function(){
        toggleCTA();
        setNYELink();
      }, 0);
      return result;
    };
  });
})();
</script>
<?php });
