class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Game constants
    this.GRAVITY = 0.05 / 2;
    this.ROTATION_SPEED = 0.05 / 2;
    this.THRUST_POWER = 0.15 / 2;
    this.INITIAL_FUEL = 100;
    this.MOON_ROTATION_SPEED = 0.0005;

    // Success conditions
    this.MAX_LANDING_SPEED = 2;
    this.MAX_LANDING_ANGLE = Math.PI / 12; // 15 degrees

    // Messages
    this.successMessages = [
      "Houston, the Eagle has landed!",
      "That's one small step for a player...",
      "Mission accomplished! Neil would be proud!",
      "Touchdown confirmed. Outstanding work, Commander!",
    ];
    this.failureMessages = [
      "Houston, we have a problem...",
      "Ground Control to Major Tom: That didn't go well",
      "In space, no one can hear you crash",
      "Let's call that a 'rapid unscheduled disassembly'",
    ];

    this.initGame();
    this.setupControls();
    this.gameLoop();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initGame() {
    // Moon properties
    this.moonRotation = 0;
    this.moonRadius = Math.max(this.canvas.width, this.canvas.height);
    this.moonX =
      this.canvas.width / 2 + (Math.random() - 0.5) * this.canvas.width * 0.5;
    this.moonY = this.canvas.height + this.moonRadius * 0.5;

    // Generate landing zone
    this.generateLandingZone();

    // Spacecraft properties
    this.spacecraft = {
      x: this.canvas.width / 2,
      y: this.canvas.height * 0.2,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      width: 20,
      height: 30,
      fuel: this.INITIAL_FUEL,
    };

    // Game state
    this.keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false };
    this.gameTime = 0;
    this.gameOver = false;
    this.lastTimestamp = performance.now();

    // Generate craters
    this.craters = Array(10)
      .fill()
      .map(() => ({
        angle: Math.random() * Math.PI,
        size: Math.random() * 30 + 10,
      }));

    this.updateDashboard();
  }

  generateLandingZone() {
    const angleRange = Math.PI * 0.6; // Visible portion of the moon
    const centerAngle = Math.PI / 2 + (Math.random() - 0.5) * angleRange;
    this.landingZone = {
      angle: centerAngle,
      width: 50,
    };
  }

  setupControls() {
    window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
    document.getElementById("tryAgain").addEventListener("click", () => {
      document.getElementById("modal").classList.add("hidden");
      this.initGame();
    });
  }

  updatePhysics(deltaTime) {
    if (this.gameOver) return;

    // Update rotation
    if (this.keys.ArrowLeft) this.spacecraft.rotation -= this.ROTATION_SPEED;
    if (this.keys.ArrowRight) this.spacecraft.rotation += this.ROTATION_SPEED;

    // Apply thrust
    if (this.keys.ArrowUp && this.spacecraft.fuel > 0) {
      const thrustX = Math.sin(this.spacecraft.rotation) * this.THRUST_POWER;
      const thrustY = -Math.cos(this.spacecraft.rotation) * this.THRUST_POWER;
      this.spacecraft.velocityX += thrustX;
      this.spacecraft.velocityY += thrustY;
      this.spacecraft.fuel = Math.max(0, this.spacecraft.fuel - 0.2);
    }

    // Calculate distance and direction to moon center
    const dx = this.moonX - this.spacecraft.x;
    const dy = this.moonY - this.spacecraft.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Apply gravity towards moon center
    const gravityX = (dx / distance) * this.GRAVITY;
    const gravityY = (dy / distance) * this.GRAVITY;
    this.spacecraft.velocityX += gravityX;
    this.spacecraft.velocityY += gravityY;

    // Update position
    this.spacecraft.x += this.spacecraft.velocityX;
    this.spacecraft.y += this.spacecraft.velocityY;

    // Update moon rotation
    this.moonRotation += this.MOON_ROTATION_SPEED;

    // Check for collision with moon surface
    if (distance <= this.moonRadius + this.spacecraft.height / 2) {
      this.checkLanding();
    }

    this.gameTime += deltaTime / 1000;
    this.updateDashboard();
  }

  checkLanding() {
    const landingAngle =
      Math.atan2(
        this.spacecraft.y - this.moonY,
        this.spacecraft.x - this.moonX
      ) + Math.PI;

    const angleDiff = Math.abs(landingAngle - this.landingZone.angle);
    const speed = Math.sqrt(
      this.spacecraft.velocityX * this.spacecraft.velocityX +
        this.spacecraft.velocityY * this.spacecraft.velocityY
    );
    const isUpright =
      Math.abs(this.spacecraft.rotation % (Math.PI * 2)) <
      this.MAX_LANDING_ANGLE;
    const isInZone = angleDiff < 0.1;
    const isSoftLanding = speed < this.MAX_LANDING_SPEED;

    if (isInZone && isSoftLanding && isUpright) {
      this.showGameOver(true);
    } else {
      this.showGameOver(false);
    }
  }

  updateDashboard() {
    const altitude = Math.max(
      0,
      Math.floor(
        Math.sqrt(
          Math.pow(this.spacecraft.x - this.moonX, 2) +
            Math.pow(this.spacecraft.y - this.moonY, 2)
        ) - this.moonRadius
      )
    );

    document.getElementById("altitude").textContent = altitude;
    document.getElementById("verticalSpeed").textContent = (-this.spacecraft
      .velocityY).toFixed(1);
    document.getElementById("horizontalSpeed").textContent =
      this.spacecraft.velocityX.toFixed(1);
    document.getElementById("fuel").textContent = Math.ceil(
      this.spacecraft.fuel
    );
    document.getElementById("time").textContent = Math.floor(this.gameTime);

    const score = Math.floor(
      this.spacecraft.fuel * 10 +
        1000 / (this.gameTime + 1) +
        1000 / (altitude + 1)
    );
    document.getElementById("score").textContent = score;
  }

  showGameOver(success) {
    this.gameOver = true;
    const modal = document.getElementById("modal");
    const content = document.getElementById("modalContent");

    modal.classList.remove("hidden", "success", "failure");
    modal.classList.add(success ? "success" : "failure");

    const messages = success ? this.successMessages : this.failureMessages;
    content.textContent = messages[Math.floor(Math.random() * messages.length)];
  }

  render() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.ctx.fillStyle = "white";
    for (let i = 0; i < 200; i++) {
      const x = ((Math.sin(i * 567) + 1) * this.canvas.width) / 2;
      const y = ((Math.sin(i * 678) + 1) * this.canvas.height) / 2;
      this.ctx.fillRect(x, y, 1, 1);
    }

    // Draw moon
    this.ctx.save();
    this.ctx.translate(this.moonX, this.moonY);
    this.ctx.rotate(this.moonRotation);

    // Moon body
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.moonRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#999";
    this.ctx.fill();

    // Craters
    this.ctx.fillStyle = "#777";
    for (const crater of this.craters) {
      const x = Math.cos(crater.angle) * (this.moonRadius - crater.size);
      const y = Math.sin(crater.angle) * (this.moonRadius - crater.size);
      this.ctx.beginPath();
      this.ctx.arc(x, y, crater.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Landing zone
    this.ctx.save();
    this.ctx.rotate(this.landingZone.angle);
    this.ctx.fillStyle = "#0f0";
    this.ctx.fillRect(
      -this.landingZone.width / 2,
      -this.moonRadius - 5,
      this.landingZone.width,
      10
    );
    this.ctx.restore();

    this.ctx.restore();

    // Draw spacecraft
    this.ctx.save();
    this.ctx.translate(this.spacecraft.x, this.spacecraft.y);
    this.ctx.rotate(this.spacecraft.rotation);

    // Main body
    this.ctx.fillStyle = "#silver";
    this.ctx.fillRect(
      -this.spacecraft.width / 2,
      -this.spacecraft.height / 2,
      this.spacecraft.width,
      this.spacecraft.height
    );

    // Landing legs
    this.ctx.beginPath();
    this.ctx.moveTo(-this.spacecraft.width / 2, this.spacecraft.height / 2);
    this.ctx.lineTo(-this.spacecraft.width, this.spacecraft.height / 2 + 10);
    this.ctx.moveTo(this.spacecraft.width / 2, this.spacecraft.height / 2);
    this.ctx.lineTo(this.spacecraft.width, this.spacecraft.height / 2 + 10);
    this.ctx.strokeStyle = "#silver";
    this.ctx.stroke();

    // Thruster flame
    if (this.keys.ArrowUp && this.spacecraft.fuel > 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(-5, this.spacecraft.height / 2);
      this.ctx.lineTo(5, this.spacecraft.height / 2);
      this.ctx.lineTo(0, this.spacecraft.height / 2 + 15);
      this.ctx.fillStyle = "#f70";
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.updatePhysics(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Start the game
new Game();
