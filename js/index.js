
window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

// now we will setup our basic variables for the demo
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
// full screen dimensions
cw = window.innerWidth,
ch = window.innerHeight,
// firework collection
fireworks = [],
// particle collection
particles = [],
// starting hue
hue = 120,
// when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
limiterTotal = 100,
limiterTick = 0,
// this will time the auto launches of fireworks, one launch per 80 loop ticks
timerTotal = 80,
timerTick = 0,
mousedown = false,
// mouse x coordinate,
mx,
// mouse y coordinate
my;

// set canvas dimensions
canvas.width = cw;
canvas.height = ch;

// now we are going to setup our function placeholders for the entire demo

// get a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
  yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
function Firework(sx, sy, tx, ty) {
  // actual coordinates
  this.x = sx;
  this.y = sy;
  // starting coordinates
  this.sx = sx;
  this.sy = sy;
  // target coordinates
  this.tx = tx;
  this.ty = ty;
  // distance from starting point to target
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 3;
  // populate initial coordinate collection with the current coordinates
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // circle target indicator radius
  this.targetRadius = 1;
}

// update firework
Firework.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);

  // cycle the circle target indicator radius
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // speed up the firework
  this.speed *= this.acceleration;

  // get the current velocities based on angle and speed
  var vx = Math.cos(this.angle) * this.speed,
  vy = Math.sin(this.angle) * this.speed;
  // how far will the firework have traveled with velocities applied?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // remove the firework, use the index passed into the update function to determine which to remove
    fireworks.splice(index, 1);
  } else {
    // target not reached, keep traveling
    this.x += vx;
    this.y += vy;
  }
};

// draw firework
Firework.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinate in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // draw the target for this firework with a pulsing circle
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
};

// create particle
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // set a random angle in all possible directions, in radians
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // friction will slow the particle down
  this.friction = 0.95;
  // gravity will be applied and pull the particle down
  this.gravity = 1;
  // set the hue to a random number +-20 of the overall hue variable
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // set how fast the particle fades out
  this.decay = random(0.015, 0.03);
}

// update particle
Particle.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);
  // slow down the particle
  this.speed *= this.friction;
  // apply velocity
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // fade out the particle
  this.alpha -= this.decay;

  // remove the particle once the alpha is low enough, based on the passed in index
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

// draw particle
Particle.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinates in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
};

// create particle group/explosion
function createParticles(x, y) {
  // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// main demo loop
function loop() {
  // this function will run endlessly with requestAnimationFrame
  requestAnimFrame(loop);

  // increase the hue to get different colored fireworks over time
  hue += 0.5;

  // normally, clearRect() would be used to clear the canvas
  // we want to create a trailing effect though
  // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
  ctx.globalCompositeOperation = 'destination-out';
  // decrease the alpha property to create more prominent trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // change the composite operation back to our main mode
  // lighter creates bright highlight points as the fireworks and particles overlap each other
  ctx.globalCompositeOperation = 'lighter';

  // loop over each firework, draw it, update it
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // loop over each particle, draw it, update it
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  // launch fireworks automatically to random coordinates, when the mouse isn't down
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limit the rate at which fireworks get launched when mouse is down
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
      fireworks.push(new Firework(cw / 2, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

window.onload = function () {
  var merrywrap = document.getElementById("merrywrap");
  var box = merrywrap.getElementsByClassName("giftbox")[0];
  var step = 1;
  var stepMinutes = [2000, 2000, 1000, 1000];
  function init() {
    box.addEventListener("click", openBox, false);
  }
  function stepClass(step) {
    merrywrap.className = 'merrywrap';
    merrywrap.className = 'merrywrap step-' + step;
  }
  function openBox() {
    if (step === 1) {
      box.removeEventListener("click", openBox, false);
    }
    stepClass(step);
    if (step === 3) {
    }
    if (step === 4) {
      reveal();
      return;
    }
    setTimeout(openBox, stepMinutes[step - 1]);
    step++;
  }

  init();

};

function reveal() {
  document.querySelector('.merrywrap').style.backgroundColor = 'transparent';

  loop();

  var w, h;
  if (window.innerWidth >= 1000) {
    w = 360;h = 640;
  } else
  {
    w = 255;h = 155;
  }

  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", "data:image/jpeg;base64,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");
  //ifrm.style.width = `${w}px`;
  //ifrm.style.height = `${h}px`;
  ifrm.style.border = 'none';
  document.querySelector('#video').appendChild(ifrm);
}

