const LOREM_TEXT =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras et magna sit amet arcu aliquet ullamcorper. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Maecenas placerat lacinia posuere. Etiam posuere at sem at egestas. Maecenas leo arcu, ullamcorper pellentesque mollis vel, porta sit amet diam. Nulla vel lacinia eros. Donec et felis eu eros varius malesuada. Donec non sagittis enim. Nam pulvinar, diam faucibus maximus tristique, metus enim tincidunt nunc, imperdiet semper tellus enim nec purus. Curabitur urna tortor, blandit et volutpat sed, consequat eget urna. Nulla semper vel nisi vitae maximus. Suspendisse potenti. Vestibulum sed justo non nisl ultricies semper. Vestibulum vel dignissim urna, at pretium odio. Duis velit nisl, porttitor vitae lacinia eu, varius quis ante. Pellentesque velit nulla, viverra ut sapien vel, porttitor finibus velit. Suspendisse massa ligula, tempor sed bibendum id, egestas eget mi. Cras consequat arcu at porta sagittis. Mauris ac nibh at nisl pulvinar dignissim id id nunc. Nulla eleifend dolor a mollis fermentum. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aliquam nec tortor id dui aliquam pulvinar.";

class ContourAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.lines = [];
    this.animationTime = 0;
    this.startTime = null;
    this.lastResize = 0;
    this.resizeObserver = null;

    this.init();
  }

  calculateCharsPerLine(width, height) {
    const baseChars = Math.floor(width / 20);
    const widthFactor = 1 + Math.min(0.4, (width - 1024) / 2500);
    const scaledChars = Math.floor(baseChars * widthFactor);
    return Math.max(35, Math.min(80, scaledChars));
  }

  calculateFontSize(width, height) {
    const minDimension = Math.min(width, height);
    return Math.max(24, Math.min(48, Math.floor(20 + minDimension * 0.04)));
  }

  resize() {
    const now = Date.now();
    if (now - this.lastResize < 100) return;
    this.lastResize = now;

    const container = this.canvas.parentElement || document.body;
    const width = container.clientWidth;
    const height = window.innerHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(dpr, dpr);

    this.generateContourLines(width, height);
  }

  generateContourLines(width, height) {
    this.lines = [];
    const padding = 20;
    const numLines = 5;
    const TABLET_BREAKPOINT = 600;
    const isTablet = width >= TABLET_BREAKPOINT;
    const maxContentHeight = height * 0.30;
    const spacing = maxContentHeight / (numLines - 1);

    const extraWidth = 50;
    const totalWidth = width + extraWidth * 2;
    const startX = -extraWidth;

    for (let i = 0; i < numLines; i++) {
      const baseY = padding + i * spacing;
      const points = [];
      const pathSegments = 40;
      const stepX = totalWidth / pathSegments;

      for (let j = 0; j <= pathSegments; j++) {
        const x = startX + j * stepX;
        const normalizedX = (x / width - 0.5) * 2;

        const loopFrequency = 1.2 + i * 0.05;
        const loopPhase = i * 0.4;

        const wave = Math.sin(
          (j / pathSegments) * Math.PI * 2 * loopFrequency + loopPhase,
        );
        const secondaryWave =
          Math.sin((j / pathSegments) * Math.PI * 4 * loopFrequency) * 0.3;

        const edgeTaper = 1 - Math.pow(normalizedX, 2) * 0.3;
        const amplitude = spacing * 0.4 * edgeTaper;

        const y = baseY + (wave + secondaryWave) * amplitude;
        points.push({ x, y });
      }

      const anglesFlat = [];
      for (let j = 0; j < points.length - 2; j++) {
        const x0 = points[j].x;
        const y0 = points[j].y;
        const x2 = points[j + 2].x;
        const y2 = points[j + 2].y;
        anglesFlat.push(Math.atan2(y2 - y0, x2 - x0));
      }
      for (let k = 0; k < 2; k++) {
        anglesFlat.push(anglesFlat[anglesFlat.length - 1] || 0);
      }

      const speed = 30000;

      this.lines.push({
        id: i,
        points,
        anglesFlat,
        speed,
      });
    }
  }

  getPointOnPath(line, progress) {
    const points = line.points;
    const anglesFlat = line.anglesFlat;
    const numPoints = points.length;

    const idx = Math.floor(progress * (numPoints - 1));
    const nextIdx = Math.min(idx + 1, numPoints - 1);
    const t = (progress * (numPoints - 1)) % 1;

    const p0 = points[idx];
    const p1 = points[nextIdx];

    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;

    const angle = anglesFlat[idx] || 0;

    return { x, y, angle };
  }

  draw() {
    const width = parseFloat(this.canvas.style.width);
    const height = parseFloat(this.canvas.style.height);

    this.ctx.clearRect(0, 0, width, height);

    const CHARS_PER_LINE = this.calculateCharsPerLine(width, height);
    const CHAR_SPACING = 1 / CHARS_PER_LINE;
    const fontSize = this.calculateFontSize(width, height);
    const LINES_TEXT_OFFSET = 40;

    this.ctx.font = `${fontSize}px 'Roboto Mono', monospace`;
    this.ctx.fillStyle = "#21242b";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";

    this.lines.forEach((line, lineIndex) => {
      const startOffset = (lineIndex * LINES_TEXT_OFFSET) % LOREM_TEXT.length;
      const chars = LOREM_TEXT.slice(startOffset, startOffset + CHARS_PER_LINE);

      chars.split("").forEach((char, charIndex) => {
        const charOffset = (charIndex * CHAR_SPACING) % 1;
        const effectiveProgress =
          (1 - (this.animationTime % line.speed) / line.speed + charOffset) % 1;

        const { x, y, angle } = this.getPointOnPath(line, effectiveProgress);

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.fillText(char, 0, 0);
        this.ctx.restore();
      });
    });
  }

  animate(timestamp) {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;

    this.animationTime = elapsed;

    this.draw();

    requestAnimationFrame((t) => this.animate(t));
  }

  init() {
    this.resize();

    window.addEventListener("resize", () => this.resize());

    requestAnimationFrame((t) => this.animate(t));
  }
}

const canvas = document.getElementById("contour-canvas");
if (canvas) {
  new ContourAnimation(canvas);
}
