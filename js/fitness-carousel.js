/* ============================================================
   fitness-carousel.js — Carrousel photos de la salle de fitness
   1re image = la photo actuelle (elle reste), suivie des autres.
   Flèches + puces + défilement auto + swipe tactile.
   ============================================================ */
(function () {
  'use strict';
  var car = document.getElementById('fit-carousel');
  if (!car) return;
  var track = car.querySelector('.fit-track');
  if (!track) return;
  var n = track.children.length;
  if (n <= 1) return;

  var dots = Array.prototype.slice.call(car.querySelectorAll('.fit-dots button'));
  var idx = 0, timer = null;
  var DELAY = 4500;

  function go(i) {
    idx = (i % n + n) % n;
    track.style.transform = 'translateX(' + (-idx * 100) + '%)';
    dots.forEach(function (d, k) { d.style.opacity = k === idx ? '1' : '.4'; });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { stop(); timer = setInterval(function () { go(idx + 1); }, DELAY); }
  function reset() { start(); }

  var next = car.querySelector('.fit-next'), prev = car.querySelector('.fit-prev');
  if (next) next.addEventListener('click', function () { go(idx + 1); reset(); });
  if (prev) prev.addEventListener('click', function () { go(idx - 1); reset(); });
  dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); reset(); }); });

  car.addEventListener('mouseenter', stop);
  car.addEventListener('mouseleave', start);

  // Swipe tactile
  var x0 = null;
  car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  car.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1);
    x0 = null; start();
  }, { passive: true });

  go(0);
  start();
})();
