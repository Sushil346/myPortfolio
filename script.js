const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('#nav-menu');
const yearSpan = document.querySelector('#year');

yearSpan.textContent = new Date().getFullYear();

navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', !expanded);
  navMenu.classList.toggle('open');
});

navMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const neuralCanvas = document.getElementById('neural-network');

if (neuralCanvas) {
  const ctx = neuralCanvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const opts = {
    range: 140,
    baseConnections: 3,
    addedConnections: 5,
    baseSize: 4,
    minSize: 0.8,
    dataToConnectionSize: 0.32,
    sizeMultiplier: 0.65,
    allowedDist: 32,
    baseDist: 36,
    addedDist: 26,
    connectionAttempts: 100,
    dataToConnections: 1,
    baseSpeed: 0.04,
    addedSpeed: 0.05,
    baseGlowSpeed: 0.4,
    addedGlowSpeed: 0.4,
    rotVelX: 0.003,
    rotVelY: 0.002,
    repaintColor: 'rgba(0, 0, 0, 0)',
    connectionColor: 'hsla(230, 80%, light%, alp)',
    rootColor: 'hsla(255, 95%, light%, alp)',
    endColor: 'hsla(170, 82%, light%, alp)',
    dataColor: 'hsla(205, 88%, light%, alp)',
    wireframeWidth: 0.08,
    wireframeColor: 'rgba(124, 108, 242, 0.18)',
    depth: 250,
    focalLength: 250,
    vanishPoint: { x: 0, y: 0 }
  };

  const Tau = Math.PI * 2;
  const connections = [];
  const toDevelop = [];
  const data = [];
  const all = [];

  let squareRange = opts.range * opts.range;
  let squareAllowed = opts.allowedDist * opts.allowedDist;
  let mostDistant = opts.depth + opts.range;
  let sinX = 0;
  let sinY = 0;
  let cosX = 0;
  let cosY = 0;
  let tick = 0;
  let width = 0;
  let height = 0;
  let animating = false;

  function resizeCanvas() {
    const rect = neuralCanvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    neuralCanvas.width = rect.width * dpr;
    neuralCanvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    opts.vanishPoint.x = width / 2;
    opts.vanishPoint.y = height / 2;
    ctx.clearRect(0, 0, width, height);
  }

  function squareDist(a, b) {
    const x = b.x - a.x;
    const y = b.y - a.y;
    const z = b.z - a.z;
    return x * x + y * y + z * z;
  }

  function Connection(x, y, z, size) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size;
    this.screen = {};
    this.links = [];
    this.isEnd = false;
    this.glowSpeed = opts.baseGlowSpeed + opts.addedGlowSpeed * Math.random();
  }

  Connection.prototype.link = function () {
    if (this.size < opts.minSize) return (this.isEnd = true);

    const links = [];
    const connectionsNum = (opts.baseConnections + Math.random() * opts.addedConnections) | 0;
    let attempt = opts.connectionAttempts;

    while (links.length < connectionsNum && --attempt > 0) {
      const alpha = Math.random() * Math.PI;
      const beta = Math.random() * Tau;
      const len = opts.baseDist + opts.addedDist * Math.random();

      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);
      const cosB = Math.cos(beta);
      const sinB = Math.sin(beta);

      const pos = {
        x: this.x + len * cosA * sinB,
        y: this.y + len * sinA * sinB,
        z: this.z + len * cosB
      };

      if (pos.x * pos.x + pos.y * pos.y + pos.z * pos.z < squareRange) {
        let passedExisting = true;
        let passedBuffered = true;

        for (let i = 0; i < connections.length; ++i) {
          if (squareDist(pos, connections[i]) < squareAllowed) passedExisting = false;
        }

        if (passedExisting) {
          for (let i = 0; i < links.length; ++i) {
            if (squareDist(pos, links[i]) < squareAllowed) passedBuffered = false;
          }
        }

        if (passedExisting && passedBuffered) links.push({ x: pos.x, y: pos.y, z: pos.z });
      }
    }

    if (links.length === 0) {
      this.isEnd = true;
    } else {
      for (let i = 0; i < links.length; ++i) {
        const pos = links[i];
        const connection = new Connection(pos.x, pos.y, pos.z, this.size * opts.sizeMultiplier);
        this.links[i] = connection;
        all.push(connection);
        connections.push(connection);
      }
      for (let i = 0; i < this.links.length; ++i) toDevelop.push(this.links[i]);
    }
  };

  Connection.prototype.step = function () {
    this.setScreen();
    this.screen.color = (this.isEnd ? opts.endColor : opts.connectionColor)
      .replace('light', 32 + ((tick * this.glowSpeed) % 28))
      .replace('alp', 0.08 + (1 - this.screen.z / mostDistant) * 0.42);

    for (let i = 0; i < this.links.length; ++i) {
      ctx.moveTo(this.screen.x, this.screen.y);
      ctx.lineTo(this.links[i].screen.x, this.links[i].screen.y);
    }
  };

  Connection.rootStep = function () {
    this.setScreen();
    this.screen.color = opts.rootColor
      .replace('light', 36 + ((tick * this.glowSpeed) % 26))
      .replace('alp', (1 - this.screen.z / mostDistant) * 0.6);

    for (let i = 0; i < this.links.length; ++i) {
      ctx.moveTo(this.screen.x, this.screen.y);
      ctx.lineTo(this.links[i].screen.x, this.links[i].screen.y);
    }
  };

  Connection.prototype.draw = function () {
    ctx.fillStyle = this.screen.color;
    ctx.beginPath();
    ctx.arc(this.screen.x, this.screen.y, this.screen.scale * this.size, 0, Tau);
    ctx.fill();
  };

  function Data(connection) {
    this.glowSpeed = opts.baseGlowSpeed + opts.addedGlowSpeed * Math.random();
    this.speed = opts.baseSpeed + opts.addedSpeed * Math.random();
    this.screen = {};
    this.setConnection(connection);
  }

  Data.prototype.reset = function () {
    this.setConnection(connections[0]);
    this.ended = 2;
  };

  Data.prototype.step = function () {
    this.proportion += this.speed;

    if (this.proportion < 1) {
      this.x = this.ox + this.dx * this.proportion;
      this.y = this.oy + this.dy * this.proportion;
      this.z = this.oz + this.dz * this.proportion;
      this.size = (this.os + this.ds * this.proportion) * opts.dataToConnectionSize;
    } else {
      this.setConnection(this.nextConnection);
    }

    this.screen.lastX = this.screen.x;
    this.screen.lastY = this.screen.y;
    this.setScreen();
    this.screen.color = opts.dataColor
      .replace('light', 40 + ((tick * this.glowSpeed) % 42))
      .replace('alp', 0.12 + (1 - this.screen.z / mostDistant) * 0.38);
  };

  Data.prototype.draw = function () {
    if (this.ended) return --this.ended;

    ctx.beginPath();
    ctx.strokeStyle = this.screen.color;
    ctx.lineWidth = this.size * this.screen.scale;
    ctx.moveTo(this.screen.lastX, this.screen.lastY);
    ctx.lineTo(this.screen.x, this.screen.y);
    ctx.stroke();
  };

  Data.prototype.setConnection = function (connection) {
    if (connection.isEnd) {
      this.reset();
    } else {
      this.connection = connection;
      this.nextConnection = connection.links[(connection.links.length * Math.random()) | 0];

      this.ox = connection.x;
      this.oy = connection.y;
      this.oz = connection.z;
      this.os = connection.size;

      this.nx = this.nextConnection.x;
      this.ny = this.nextConnection.y;
      this.nz = this.nextConnection.z;
      this.ns = this.nextConnection.size;

      this.dx = this.nx - this.ox;
      this.dy = this.ny - this.oy;
      this.dz = this.nz - this.oz;
      this.ds = this.ns - this.os;

      this.proportion = 0;
    }
  };

  Connection.prototype.setScreen = Data.prototype.setScreen = function () {
    let x = this.x;
    let y = this.y;
    let z = this.z;

    let Y = y;
    y = y * cosX - z * sinX;
    z = z * cosX + Y * sinX;

    let Z = z;
    z = z * cosY - x * sinY;
    x = x * cosY + Z * sinY;

    this.screen.z = z;
    z += opts.depth;
    this.screen.scale = opts.focalLength / z;
    this.screen.x = opts.vanishPoint.x + x * this.screen.scale;
    this.screen.y = opts.vanishPoint.y + y * this.screen.scale;
  };

  function init() {
    connections.length = 0;
    data.length = 0;
    all.length = 0;
    toDevelop.length = 0;

    const connection = new Connection(0, 0, 0, opts.baseSize);
    connection.step = Connection.rootStep;
    connections.push(connection);
    all.push(connection);
    connection.link();

    while (toDevelop.length > 0) {
      toDevelop[0].link();
      toDevelop.shift();
    }

    if (!animating) {
      animating = true;
      anim();
    }
  }

  function anim() {
    window.requestAnimationFrame(anim);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    ++tick;

    const rotX = tick * opts.rotVelX;
    const rotY = tick * opts.rotVelY;

    cosX = Math.cos(rotX);
    sinX = Math.sin(rotX);
    cosY = Math.cos(rotY);
    sinY = Math.sin(rotY);

    if (data.length < connections.length * opts.dataToConnections) {
      const datum = new Data(connections[0]);
      data.push(datum);
      all.push(datum);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.lineWidth = opts.wireframeWidth;
    ctx.strokeStyle = opts.wireframeColor;
    all.forEach((item) => item.step());
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    all.sort((a, b) => b.screen.z - a.screen.z);
    all.forEach((item) => item.draw());
  }

  resizeCanvas();
  init();
  window.addEventListener('resize', resizeCanvas);
  neuralCanvas.addEventListener('click', init);
}
