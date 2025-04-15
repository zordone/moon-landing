class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Game constants
    this.gravity = 0.05;
    this.thrustPower = 0.15;
    this.rotationSpeed = 3;
    this.initialFuel = 100;

    // Moon surface generation
    this.generateMoonSurface();

    // Game state
    this.resetGame();

    // Messages
    this.successMessages = [
      "Houston, we have a perfect landing!",
      "One small step for a lander, one giant leap for robot-kind!",
      "Landing smooth as butter! Neil Armstrong would be proud!",
    ];

    this.failureMessages = [
      "Houston, we have a problem...",
      "That's gonna leave a mark!",
      "Maybe try landing gear-side down next time?",
    ];

    // Input handling
    this.keys = {};
    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));

    // Try again button
    document.getElementById("tryAgain").addEventListener("click", () => {
      this.hideModal();
      this.resetGame();
    });

    // Start game loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  generateMoonSurface() {
    this.moonPoints = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * this.canvas.width;
      const baseY = this.canvas.height * 0.7;
      const noise = Math.sin(i * 0.2) * 30 + Math.sin(i * 0.5) * 20;
      this.moonPoints.push({ x, y: baseY + noise });
    }

    // Set landing zone (30% - 40% of width)
    const landingStart = Math.floor(segments * 0.3);
    const landingEnd = Math.floor(segments * 0.4);
    const landingY = this.canvas.height * 0.65;
    for (let i = landingStart; i <= landingEnd; i++) {
      this.moonPoints[i].y = landingY;
    }
    this.landingZone = {
      x: this.moonPoints[landingStart].x,
      y: landingY,
      width: this.moonPoints[landingEnd].x - this.moonPoints[landingStart].x,
    };
  }

  resetGame() {
    this.spacecraft = {
      x: this.canvas.width * 0.5,
      y: this.canvas.height * 0.2,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      width: 20,
      height: 30,
    };
    this.fuel = this.initialFuel;
    this.gameOver = false;
    this.startTime = performance.now();
    this.moonRotation = 0;
  }

  update(deltaTime) {
    if (this.gameOver) return;

    // Update moon rotation
    this.moonRotation += 0.0001 * deltaTime;

    // Handle input
    if (this.keys["ArrowLeft"]) {
      this.spacecraft.rotation -= this.rotationSpeed * (deltaTime / 1000);
    }
    if (this.keys["ArrowRight"]) {
      this.spacecraft.rotation += this.rotationSpeed * (deltaTime / 1000);
    }

    // Apply thrust
    if (this.keys["Space"] && this.fuel > 0) {
      const thrustX = Math.sin(this.spacecraft.rotation) * this.thrustPower;
      const thrustY = -Math.cos(this.spacecraft.rotation) * this.thrustPower;
      this.spacecraft.velocityX += thrustX;
      this.spacecraft.velocityY += thrustY;
      this.fuel = Math.max(0, this.fuel - 0.1);
    }

    // Apply gravity
    this.spacecraft.velocityY += this.gravity;

    // Update position
    this.spacecraft.x += this.spacecraft.velocityX;
    this.spacecraft.y += this.spacecraft.velocityY;

    // Check collision with moon surface
    this.checkCollision();

    // Update dashboard
    this.updateDashboard();
  }

  checkCollision() {
    const points = this.getSpacecraftPoints();
    const bottomPoint = points[0];

    // Find the ground Y at spacecraft X
    const groundY = this.getGroundYAtX(this.spacecraft.x);

    if (bottomPoint.y >= groundY) {
      const isInLandingZone =
        this.spacecraft.x >= this.landingZone.x &&
        this.spacecraft.x <= this.landingZone.x + this.landingZone.width;
      const isUpright =
        Math.abs(this.spacecraft.rotation % (Math.PI * 2)) < 0.2;
      const isSoftLanding =
        Math.abs(this.spacecraft.velocityY) < 0.5 &&
        Math.abs(this.spacecraft.velocityX) < 0.3;

      this.gameOver = true;
      const success = isInLandingZone && isUpright && isSoftLanding;

      if (success) {
        this.showModal(
          "Success!",
          this.successMessages[
            Math.floor(Math.random() * this.successMessages.length)
          ]
        );
      } else {
        this.showModal(
          "Game Over",
          this.failureMessages[
            Math.floor(Math.random() * this.failureMessages.length)
          ]
        );
      }
    }
  }

  getGroundYAtX(x) {
    const segment = Math.floor(
      (x / this.canvas.width) * (this.moonPoints.length - 1)
    );
    const segmentX =
      (x / this.canvas.width) * (this.moonPoints.length - 1) - segment;
    const y1 = this.moonPoints[segment]?.y || this.canvas.height;
    const y2 = this.moonPoints[segment + 1]?.y || this.canvas.height;
    return y1 + (y2 - y1) * segmentX;
  }

  getSpacecraftPoints() {
    const points = [
      { x: 0, y: this.spacecraft.height / 2 }, // bottom
      { x: -this.spacecraft.width / 2, y: -this.spacecraft.height / 2 }, // top left
      { x: this.spacecraft.width / 2, y: -this.spacecraft.height / 2 }, // top right
    ];

    return points.map((p) => {
      const rotatedX =
        p.x * Math.cos(this.spacecraft.rotation) -
        p.y * Math.sin(this.spacecraft.rotation);
      const rotatedY =
        p.x * Math.sin(this.spacecraft.rotation) +
        p.y * Math.cos(this.spacecraft.rotation);
      return {
        x: rotatedX + this.spacecraft.x,
        y: rotatedY + this.spacecraft.y,
      };
    });
  }

  updateDashboard() {
    const timeElapsed = Math.floor((performance.now() - this.startTime) / 1000);
    document.getElementById("altitude").textContent = Math.floor(
      this.canvas.height - this.spacecraft.y
    );
    document.getElementById("hSpeed").textContent =
      this.spacecraft.velocityX.toFixed(2);
    document.getElementById("vSpeed").textContent =
      this.spacecraft.velocityY.toFixed(2);
    document.getElementById("fuel").textContent = Math.floor(this.fuel);
    document.getElementById("time").textContent = timeElapsed;
  }

  showModal(title, message) {
    const modal = document.getElementById("modal");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;
    modal.classList.remove("hidden");
  }

  hideModal() {
    document.getElementById("modal").classList.add("hidden");
  }

  render() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.ctx.fillStyle = "white";
    for (let i = 0; i < 200; i++) {
      const x = (Math.sin(i * 567.89) * 0.5 + 0.5) * this.canvas.width;
      const y = (Math.cos(i * 123.45) * 0.5 + 0.5) * this.canvas.height;
      this.ctx.fillRect(x, y, 1, 1);
    }

    // Draw moon surface
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height);
    for (const point of this.moonPoints) {
      this.ctx.lineTo(point.x, point.y);
    }
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fillStyle = "#666";
    this.ctx.fill();

    // Draw landing zone
    this.ctx.fillStyle = "#0f0";
    this.ctx.fillRect(
      this.landingZone.x,
      this.landingZone.y - 5,
      this.landingZone.width,
      5
    );

    // Draw spacecraft
    this.ctx.save();
    this.ctx.translate(this.spacecraft.x, this.spacecraft.y);
    this.ctx.rotate(this.spacecraft.rotation);

    // Draw body
    this.ctx.fillStyle = "#ccc";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.spacecraft.height / 2);
    this.ctx.lineTo(-this.spacecraft.width / 2, -this.spacecraft.height / 2);
    this.ctx.lineTo(this.spacecraft.width / 2, -this.spacecraft.height / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw thruster fire when space is pressed
    if (this.keys["Space"] && this.fuel > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(-5, this.spacecraft.height / 2);
      this.ctx.lineTo(5, this.spacecraft.height / 2);
      this.ctx.lineTo(0, this.spacecraft.height / 2 + 15);
      this.ctx.closePath();
      this.ctx.fillStyle = "#f44";
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// Start the game when the window loads
window.addEventListener("load", () => new Game());
