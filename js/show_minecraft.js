(function() {
  if (Math.random() < 0.0001) {   // 0.01%
    var logo = document.getElementById('logo-img');
    if (logo) {
      logo.src = 'assets/logo/minecraft_small.png';
      console.log('Minecraft!');
    }
  }
})();