// Game constants
const MOON_RADIUS = 400; // meters
const MOON_GRAVITY = 1.62; // m/s²
const MOON_BUMPINESS = 0.03; // Adjust this value to change the bumpiness of the moon surface
const MOON_SEGMENTS = 250;
const MOON_ROTATION_SPEED = 0.02 / 60; // rotations per second
const SPACECRAFT_HEIGHT = 6; // meters
const LANDING_ZONE_SPREAD = 5; // segments
const THRUST_FORCE = 4; // m/s²
const FUEL_CONSUMPTION = 0.5; // %/s
const ROTATION_SPEED = 20; // degrees/s
const ACCEPTABLE_LANDING_ANGLE = 4; // degrees
const ACCEPTABLE_LANDING_SPEED = 2.5; // m/s

// Game messages
const SUCCESS_MESSAGES = [
  "Houston, the Eagle has landed!",
  "One small step for a lander, one giant leap for your piloting skills!",
  "Mission accomplished! NASA would be proud!",
];

const FAILURE_MESSAGES = [
  "Houston, we have a problem...",
  "That's not flying, that's falling with style!",
  "Ground control to Major Tom: You've really made a mess...",
];

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Game state
    this.isGameActive = false;
    this.isPaused = true; // Add new state for countdown pause
    this.moonPoints = [];
    this.landingZoneIndex = 0;
    this.moonRotation = 0;
    this.spacecraft = {
      x: 0,
      y: 0,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      fuel: 100,
    };

    // Input handling
    this.keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
    };

    this.setupEventListeners();
    this.generateMoon();
    this.reset();
    requestAnimationFrame(() => this.gameLoop());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.scale = Math.min(this.canvas.width, this.canvas.height) / 200;
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });

    document.getElementById("tryAgain").addEventListener("click", () => {
      document.getElementById("modal").classList.add("hidden");
      this.startCountdown();
    });
  }

  generateMoon() {
    const radius = MOON_RADIUS * this.scale;
    const centerX = this.canvas.width * 0.5;
    const centerY = this.canvas.height + radius * 0.8;

    this.moonCenter = { x: centerX, y: centerY };
    this.moonRadius = radius;

    // Place landing zone on the visible part of the moon
    const centerIndex = Math.floor(MOON_SEGMENTS / 4);
    const spread =
      Math.floor(Math.random() * (LANDING_ZONE_SPREAD * 2 + 1)) -
      LANDING_ZONE_SPREAD;
    this.landingZoneIndex = centerIndex + spread;

    this.moonPoints = [];
    for (let i = 0; i < MOON_SEGMENTS; i++) {
      const angle = ((Math.PI * 2) / MOON_SEGMENTS) * i;
      const isInLandingZone =
        this.landingZoneIndex <= i && i <= this.landingZoneIndex + 1;
      const randomOffset = isInLandingZone
        ? 0
        : (Math.random() - 0.5) * radius * MOON_BUMPINESS;
      const x = centerX + Math.cos(angle) * (radius + randomOffset);
      const y = centerY - Math.sin(angle) * (radius + randomOffset);
      this.moonPoints.push({ x, y });
    }
  }

  startCountdown() {
    let count = 3;
    const countdown = document.getElementById("countdown");
    const countdownText = document.getElementById("countdown-text");
    countdown.classList.remove("hidden");
    countdownText.textContent = count;
    this.isPaused = true; // Ensure physics is paused during countdown

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.textContent = count;
      } else if (count === 0) {
        countdownText.textContent = "GO!";
      } else {
        clearInterval(timer);
        countdown.classList.add("hidden");
        this.isPaused = false; // Start physics after countdown
        this.reset();
      }
    }, 1000);
  }

  reset() {
    this.startTime = Date.now();
    this.isGameActive = true;
    this.spacecraft = {
      x: this.canvas.width * 0.5,
      y: this.canvas.height * 0.3,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      fuel: 100,
    };
    this.generateMoon();
  }

  update() {
    if (!this.isGameActive || this.isPaused) return; // Don't update if paused

    const dt = 1 / 60; // Fixed time step
    this.moonRotation += MOON_ROTATION_SPEED * dt * Math.PI * 2;

    // Update spacecraft physics
    if (this.keys.ArrowLeft) {
      this.spacecraft.rotation -= ROTATION_SPEED * dt;
    }
    if (this.keys.ArrowRight) {
      this.spacecraft.rotation += ROTATION_SPEED * dt;
    }

    // Apply thrust
    if (this.keys.ArrowUp && this.spacecraft.fuel > 0) {
      const thrustAngle = (this.spacecraft.rotation * Math.PI) / 180;
      this.spacecraft.velocityX += Math.sin(thrustAngle) * THRUST_FORCE * dt;
      this.spacecraft.velocityY -= Math.cos(thrustAngle) * THRUST_FORCE * dt;
      this.spacecraft.fuel = Math.max(
        0,
        this.spacecraft.fuel - FUEL_CONSUMPTION * dt
      );
    }

    // Apply gravity towards moon center
    const dx = this.moonCenter.x - this.spacecraft.x;
    const dy = this.moonCenter.y - this.spacecraft.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const gravityAngle = Math.atan2(dy, dx);

    this.spacecraft.velocityX += Math.cos(gravityAngle) * MOON_GRAVITY * dt;
    this.spacecraft.velocityY += Math.sin(gravityAngle) * MOON_GRAVITY * dt;

    // Update position
    this.spacecraft.x += this.spacecraft.velocityX * dt * this.scale;
    this.spacecraft.y += this.spacecraft.velocityY * dt * this.scale;

    // Check collision with moon surface
    this.checkCollision();

    // Update dashboard
    this.updateDashboard();
  }

  checkCollision() {
    const rotatedPoints = this.moonPoints.map((point) =>
      this.rotatePoint(point, this.moonCenter, this.moonRotation)
    );

    // Get spacecraft's collision point (bottom center of spacecraft)
    const spacecraftBottom = {
      x: this.spacecraft.x,
      y: this.spacecraft.y + SPACECRAFT_HEIGHT * this.scale * 0.5,
    };

    // Check if spacecraft is inside moon (closer to center than surface)
    const distanceToCenter = Math.sqrt(
      Math.pow(spacecraftBottom.x - this.moonCenter.x, 2) +
        Math.pow(spacecraftBottom.y - this.moonCenter.y, 2)
    );

    // Find closest surface point
    let minDistance = Infinity;
    let closestSegmentIndex = -1;
    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const p1 = rotatedPoints[i];
      const p2 = rotatedPoints[i + 1];

      // Calculate distance to line segment
      const distance = this.distanceToLineSegment(
        spacecraftBottom.x,
        spacecraftBottom.y,
        p1.x,
        p1.y,
        p2.x,
        p2.y
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestSegmentIndex = i;
      }
    }

    // Check if we're actually colliding and it's not just close
    const surfacePoint = rotatedPoints[closestSegmentIndex];
    const surfaceDistance = Math.sqrt(
      Math.pow(surfacePoint.x - this.moonCenter.x, 2) +
        Math.pow(surfacePoint.y - this.moonCenter.y, 2)
    );

    if (distanceToCenter >= surfaceDistance) {
      return; // No collision
    }

    // We have a collision, check landing conditions
    const isInLandingZone =
      Math.abs(closestSegmentIndex - this.landingZoneIndex) <= 1;
    const speed = Math.sqrt(
      this.spacecraft.velocityX * this.spacecraft.velocityX +
        this.spacecraft.velocityY * this.spacecraft.velocityY
    );
    const isUprightLanding =
      Math.abs(this.spacecraft.rotation) <= ACCEPTABLE_LANDING_ANGLE;
    const isSoftLanding = speed <= ACCEPTABLE_LANDING_SPEED;

    if (isInLandingZone && isUprightLanding && isSoftLanding) {
      this.endGame(true);
    } else {
      let reason = "";
      if (!isInLandingZone) reason = "Missed the landing zone!";
      else if (!isUprightLanding) reason = "Not upright!";
      else reason = "Too fast!";
      this.endGame(false, reason);
    }
  }

  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq != 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  endGame(success, reason = "") {
    console.log("Game ended:", success, reason);
    this.isGameActive = false;
    const modal = document.getElementById("modal");
    const modalText = document.getElementById("modal-text");

    modal.className = success ? "modal success" : "modal failure";
    const messages = success ? SUCCESS_MESSAGES : FAILURE_MESSAGES;
    const message = messages[Math.floor(Math.random() * messages.length)];
    modalText.textContent = message + (reason ? `\n${reason}` : "");

    modal.classList.remove("hidden");
    document.getElementById("tryAgain").focus();
  }

  updateDashboard() {
    const altitude = (
      (this.moonCenter.y - this.spacecraft.y) /
      this.scale
    ).toFixed(1);
    const vSpeed = this.spacecraft.velocityY.toFixed(1);
    const hSpeed = this.spacecraft.velocityX.toFixed(1);
    const rotation = this.spacecraft.rotation.toFixed(1);
    const fuel = this.spacecraft.fuel.toFixed(0);
    const time = ((Date.now() - this.startTime) / 1000).toFixed(1);

    document.getElementById("altitude").textContent = altitude;
    document.getElementById("vSpeed").textContent = vSpeed;
    document.getElementById("hSpeed").textContent = hSpeed;
    document.getElementById("rotation").textContent = rotation;
    document.getElementById("fuel").textContent = fuel;
    document.getElementById("time").textContent = time;

    // Calculate score based on various factors
    const score = Math.max(
      0,
      Math.floor(
        1000 +
          this.spacecraft.fuel * 10 -
          Math.abs(this.spacecraft.velocityX) * 100 -
          Math.abs(this.spacecraft.velocityY) * 100 -
          Math.abs(this.spacecraft.rotation) * 10
      )
    );
    document.getElementById("score").textContent = score;
  }

  draw() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw moon
    this.ctx.beginPath();
    const rotatedPoints = this.moonPoints.map((point) =>
      this.rotatePoint(point, this.moonCenter, this.moonRotation)
    );
    this.ctx.moveTo(rotatedPoints[0].x, rotatedPoints[0].y);
    for (const point of rotatedPoints) {
      this.ctx.lineTo(point.x, point.y);
    }
    this.ctx.fillStyle = "#666";
    this.ctx.fill();

    // Draw landing zone
    const p1 = rotatedPoints[this.landingZoneIndex];
    const p2 = rotatedPoints[this.landingZoneIndex + 1];
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.strokeStyle = "lime";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw spacecraft
    this.ctx.save();
    this.ctx.translate(this.spacecraft.x, this.spacecraft.y);
    this.ctx.rotate((this.spacecraft.rotation * Math.PI) / 180);

    // Main body
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(
      -SPACECRAFT_HEIGHT * this.scale * 0.2,
      -SPACECRAFT_HEIGHT * this.scale * 0.4,
      SPACECRAFT_HEIGHT * this.scale * 0.4,
      SPACECRAFT_HEIGHT * this.scale * 0.8
    );

    // Landing legs
    this.ctx.beginPath();
    const legSpread = SPACECRAFT_HEIGHT * this.scale * 0.3;
    this.ctx.moveTo(-legSpread, SPACECRAFT_HEIGHT * this.scale * 0.4);
    this.ctx.lineTo(0, SPACECRAFT_HEIGHT * this.scale * 0.2);
    this.ctx.lineTo(legSpread, SPACECRAFT_HEIGHT * this.scale * 0.4);
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw thrust if firing
    if (this.keys.ArrowUp && this.spacecraft.fuel > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, SPACECRAFT_HEIGHT * this.scale * 0.4);
      this.ctx.lineTo(-5, SPACECRAFT_HEIGHT * this.scale * 0.6);
      this.ctx.lineTo(5, SPACECRAFT_HEIGHT * this.scale * 0.6);
      this.ctx.closePath();
      this.ctx.fillStyle = "orange";
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  rotatePoint(point, center, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: cos * (point.x - center.x) - sin * (point.y - center.y) + center.x,
      y: sin * (point.x - center.x) + cos * (point.y - center.y) + center.y,
    };
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Start the game
window.addEventListener("load", () => {
  const game = new Game();
  game.startCountdown();
});
