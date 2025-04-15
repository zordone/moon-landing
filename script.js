// Game constants
const MOON_RADIUS = 400; // meters
const MOON_GRAVITY = 1.62; // m/s²
const MOON_BUMPINESS = 0.025; // bumpiness of the moon surface
const MOON_SEGMENTS = 280; // how many line segments to draw the moon
const MOON_ROTATION_SPEED = 0.02 / 60; // rotations per second
const SPACECRAFT_HEIGHT = 8; // meters
const LANDING_ZONE_SPREAD = 5; // segments
const THRUST_FORCE = 4; // m/s²
const FUEL_CONSUMPTION = 1.5; // %/s
const ROTATION_SPEED = 35; // degrees/s
const ACCEPTABLE_LANDING_ANGLE = 4; // degrees
const ACCEPTABLE_LANDING_SPEED = 2.5; // m/s
const NUM_STARS = 200; // number of stars in the background

// Game messages
const MESSAGES = {
  success: [
    "Houston, the Eagle has landed!",
    "One small step for a lander, one giant leap for your piloting skills!",
    "Mission accomplished! NASA would be proud!",
    "You nailed it! Time to plant that flag!",
    "Congratulations! You just made Neil Armstrong proud!",
    "Lunar landing successful! Now, where's the moon cheese?",
  ],
  missedZone: [
    "Navigation error: That's not the landing zone!",
    "Ground control suggests using your eyes next time.",
    "You boldly went where no one should have gone.",
    "Houston, we have a navigation problem.",
    "You missed the landing zone by a mile!",
    "Your landing zone was more of a suggestion.",
  ],
  notUpright: [
    "Houston, we have a problem: you're not upright!",
    "Your spacecraft is more of a tumbleweed right now.",
    "You might want to check your landing gear alignment.",
    "Do a barrel roll! ...Actually, don't.",
    "Astronauts prefer their spacecraft right-side up.",
    "You're a bit tilted. The spacecraft shouldn't be!",
  ],
  tooFast: [
    "Whoa there! You're going faster than a meteor!",
    "Speed limit: 2.5 m/s. You just broke it!",
    "Your spacecraft is in freefall, not flying!",
    "That's not flying, that's falling with style!",
    "Speed kills, especially on the moon!",
    "Slow and steady wins the space race.",
  ],
};

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Game state
    this.isGameActive = false;
    this.isPaused = true;
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

    // Generate stars
    this.stars = Array(NUM_STARS)
      .fill()
      .map(() => ({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.8, // Keep stars above the moon
        size: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5,
      }));

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

    // Regenerate stars for new canvas size
    this.stars = Array(NUM_STARS)
      .fill()
      .map(() => ({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.8,
        size: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5,
      }));
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
    this.isPaused = true;
    this.reset();

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownText.textContent = count;
      } else if (count === 0) {
        countdownText.textContent = "GO!";
      } else {
        clearInterval(timer);
        countdown.classList.add("hidden");
        this.isPaused = false;
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

    // Create spacecraft bounding box vertices
    const halfWidth = SPACECRAFT_HEIGHT * this.scale * 0.2; // Half the spacecraft width
    const halfHeight = SPACECRAFT_HEIGHT * this.scale * 0.4; // Half the spacecraft height
    const angle = (this.spacecraft.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Calculate the four corners of the rotated bounding box
    const corners = [
      {
        // Top Left
        x: this.spacecraft.x + (-halfWidth * cos - halfHeight * sin),
        y: this.spacecraft.y + (-halfWidth * sin + halfHeight * cos),
      },
      {
        // Top Right
        x: this.spacecraft.x + (halfWidth * cos - halfHeight * sin),
        y: this.spacecraft.y + (halfWidth * sin + halfHeight * cos),
      },
      {
        // Bottom Right
        x: this.spacecraft.x + (halfWidth * cos + halfHeight * sin),
        y: this.spacecraft.y + (halfWidth * sin - halfHeight * cos),
      },
      {
        // Bottom Left
        x: this.spacecraft.x + (-halfWidth * cos + halfHeight * sin),
        y: this.spacecraft.y + (-halfWidth * sin - halfHeight * cos),
      },
    ];

    // Check each side of the spacecraft against each moon surface segment
    let collision = false;
    let closestSegmentIndex = -1;

    for (let i = 0; i < rotatedPoints.length - 1; i++) {
      const moonP1 = rotatedPoints[i];
      const moonP2 = rotatedPoints[i + 1];

      // Check each side of the spacecraft
      for (let j = 0; j < 4; j++) {
        const spacecraftP1 = corners[j];
        const spacecraftP2 = corners[(j + 1) % 4];

        if (
          this.lineSegmentsIntersect(
            spacecraftP1.x,
            spacecraftP1.y,
            spacecraftP2.x,
            spacecraftP2.y,
            moonP1.x,
            moonP1.y,
            moonP2.x,
            moonP2.y
          )
        ) {
          collision = true;
          closestSegmentIndex = i;
          break;
        }
      }

      if (collision) break;
    }

    if (!collision) return;

    // We have a collision, check landing conditions
    const isInLandingZone =
      Math.abs(closestSegmentIndex - this.landingZoneIndex) <= 1;
    const speed = Math.sqrt(
      this.spacecraft.velocityX * this.spacecraft.velocityX +
        this.spacecraft.velocityY * this.spacecraft.velocityY
    );

    // Calculate angle to moon center (where 0 means pointing towards center)
    const angleToCenter =
      (Math.atan2(
        this.moonCenter.y - this.spacecraft.y,
        this.moonCenter.x - this.spacecraft.x
      ) *
        180) /
      Math.PI;

    // Convert spacecraft rotation to be relative to angleToCenter
    // Add 90 because spacecraft is drawn pointing upward at 0 degrees
    const relativeRotation =
      (this.spacecraft.rotation + 90 - angleToCenter) % 360;

    // Normalize to -180 to 180 range
    const normalizedRotation =
      relativeRotation > 180
        ? relativeRotation - 360
        : relativeRotation < -180
        ? relativeRotation + 360
        : relativeRotation;

    const isUprightLanding =
      Math.abs(normalizedRotation) <= ACCEPTABLE_LANDING_ANGLE;

    // Debug logging
    console.log(
      `Angle debug:`,
      `\n Expected: ${-ACCEPTABLE_LANDING_ANGLE}° to ${ACCEPTABLE_LANDING_ANGLE}°`,
      `\n Actual rotation: ${normalizedRotation.toFixed(1)}°`,
      `\n Is upright: ${isUprightLanding}`
    );

    const isSoftLanding = speed <= ACCEPTABLE_LANDING_SPEED;

    if (isInLandingZone && isUprightLanding && isSoftLanding) {
      this.endGame(true, "success");
    } else {
      let reason = "";
      if (!isInLandingZone) reason = "missedZone";
      else if (!isUprightLanding) reason = "notUpright";
      else reason = "tooFast";
      this.endGame(false, reason);
    }
  }

  // Helper function to check if two line segments intersect
  lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction vectors
    const dx1 = x2 - x1;
    const dy1 = y2 - y1;
    const dx2 = x4 - x3;
    const dy2 = y4 - y3;

    // Calculate the denominator
    const denominator = dx1 * dy2 - dy1 * dx2;

    // If lines are parallel, they don't intersect
    if (denominator === 0) return false;

    // Calculate parameters for both lines
    const t1 = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denominator;
    const t2 = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denominator;

    // Check if intersection point lies within both line segments
    return t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1;
  }

  endGame(success, reason = "") {
    this.isGameActive = false;
    const modal = document.getElementById("modal");
    const modalText = document.getElementById("modal-text");

    modal.className = success ? "modal success" : "modal failure";

    const messages = MESSAGES[reason];
    const message = messages[Math.floor(Math.random() * messages.length)];
    modalText.textContent = message;

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

    // Draw stars
    this.ctx.fillStyle = "white";
    for (const star of this.stars) {
      this.ctx.globalAlpha = star.brightness;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

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
      SPACECRAFT_HEIGHT * this.scale * 0.6
    );

    // Landing legs
    this.ctx.beginPath();
    const legSpread = SPACECRAFT_HEIGHT * this.scale * 0.3;
    this.ctx.moveTo(-legSpread, SPACECRAFT_HEIGHT * this.scale * 0.4);
    this.ctx.lineTo(0, SPACECRAFT_HEIGHT * this.scale * -0.2);
    this.ctx.lineTo(legSpread, SPACECRAFT_HEIGHT * this.scale * 0.4);
    this.ctx.strokeStyle = "white";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw thrust if firing
    if (this.keys.ArrowUp && this.spacecraft.fuel > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, SPACECRAFT_HEIGHT * this.scale * 0.2);
      this.ctx.lineTo(-5, SPACECRAFT_HEIGHT * this.scale * 1.0);
      this.ctx.lineTo(5, SPACECRAFT_HEIGHT * this.scale * 1.0);
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
