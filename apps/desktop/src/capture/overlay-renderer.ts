// Overlay renderer — vanilla TS, no React
// Displays frozen screenshot and lets user drag-select a region

const canvas = document.getElementById("overlay-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let screenshotImage: HTMLImageElement | null = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the frozen screenshot
  if (screenshotImage) {
    ctx.drawImage(screenshotImage, 0, 0, canvas.width, canvas.height);
  }

  // Dim overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isDrawing) {
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    // Clear the selected region to show original screenshot
    if (screenshotImage && w > 0 && h > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.clearRect(x, y, w, h);
      ctx.drawImage(screenshotImage, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Draw selection border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Draw dimensions label
    if (w > 40 && h > 20) {
      const label = `${Math.round(w)} \u00d7 ${Math.round(h)}`;
      ctx.font = "12px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      const metrics = ctx.measureText(label);
      const labelX = x + w / 2 - metrics.width / 2 - 4;
      const labelY = y + h + 20;
      ctx.fillRect(labelX, labelY - 14, metrics.width + 8, 18);
      ctx.fillStyle = "white";
      ctx.fillText(label, labelX + 4, labelY);
    }
  }

  // Crosshair cursor hint
  if (!isDrawing) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "14px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Drag to select a region \u00b7 Escape to cancel",
      canvas.width / 2,
      canvas.height - 40
    );
    ctx.textAlign = "start";
  }
}

// Listen for screenshot data from main process
console.log("[overlay] Renderer loaded, registering screenshot listener");
(window as any).electronAPI.onScreenshot((dataUrl: string) => {
  console.log("[overlay] Received screenshot, length:", dataUrl.length);
  screenshotImage = new Image();
  screenshotImage.onload = () => {
    console.log("[overlay] Image loaded:", screenshotImage!.width, "x", screenshotImage!.height);
    resizeCanvas();
  };
  screenshotImage.onerror = (err) => {
    console.error("[overlay] Image failed to load:", err);
  };
  screenshotImage.src = dataUrl;
});

// Tell main process we're ready
(window as any).electronAPI.readyForScreenshot();

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  currentX = e.clientX;
  currentY = e.clientY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  currentX = e.clientX;
  currentY = e.clientY;
  draw();
});

canvas.addEventListener("mouseup", (e) => {
  if (!isDrawing) return;
  isDrawing = false;
  currentX = e.clientX;
  currentY = e.clientY;

  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Minimum selection size
  if (width < 10 || height < 10) return;

  // Send region to main process via IPC
  (window as any).electronAPI.sendCaptureRegion({ x, y, width, height });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    (window as any).electronAPI.cancelCapture();
  }
});

export {};
