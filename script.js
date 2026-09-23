// --- State and Configuration ---
const config = {
    xRange: [-10, 10], // Viewport math coordinates
    yRange: [-5, 5],
    gridStep: 1,       // Spacing between grid lines in math units
    curveColor: '#38bdf8',
    pointColor: '#ffffff',
    gridColor: '#2a2e37',
    axisColor: '#64748b',
    labelColor: '#94a3b8'
};

const state = {
    isPlaying: true,
    currentX: config.xRange[0], // Start at left edge
    speed: 0.05,                // Math units per frame (adjusted by slider)
    animationFrameId: null,
    points: []                  // Store calculated points to draw the path
};

// --- DOM Elements ---
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const speedSlider = document.getElementById('speedSlider');
const container = document.querySelector('.canvas-container');

// --- Mathematical Function ---
function evaluateFunction(x) {
    return Math.sin(x);
}

// --- Coordinate Transformations ---
// Convert math x to canvas x (CSS pixels)
function mathToCanvasX(mathX) {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const mathWidth = config.xRange[1] - config.xRange[0];
    return ((mathX - config.xRange[0]) / mathWidth) * width;
}

// Convert math y to canvas y (CSS pixels, flipped because canvas y goes down)
function mathToCanvasY(mathY) {
    const height = canvas.height / (window.devicePixelRatio || 1);
    const mathHeight = config.yRange[1] - config.yRange[0];
    return height - ((mathY - config.yRange[0]) / mathHeight) * height;
}

// --- Rendering ---
function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set internal canvas resolution based on device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context so drawing operations use CSS pixel coordinates
    ctx.scale(dpr, dpr);
    
    // If the window is resized, we redraw the current state
    drawFrame();
}

function drawGridAndAxes() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, w, h);
    
    ctx.lineWidth = 1;
    ctx.font = '12px "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw Grid
    ctx.strokeStyle = config.gridColor;
    ctx.beginPath();
    
    // Vertical grid lines
    const startX = Math.floor(config.xRange[0] / config.gridStep) * config.gridStep;
    for (let x = startX; x <= config.xRange[1]; x += config.gridStep) {
        const cx = mathToCanvasX(x);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
    }
    
    // Horizontal grid lines
    const startY = Math.floor(config.yRange[0] / config.gridStep) * config.gridStep;
    for (let y = startY; y <= config.yRange[1]; y += config.gridStep) {
        const cy = mathToCanvasY(y);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
    }
    ctx.stroke();
    
    // Draw Axes
    ctx.strokeStyle = config.axisColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // X Axis
    const originY = mathToCanvasY(0);
    ctx.moveTo(0, originY);
    ctx.lineTo(w, originY);
    
    // Y Axis
    const originX = mathToCanvasX(0);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, h);
    
    ctx.stroke();
    
    // Draw Labels & Ticks
    ctx.fillStyle = config.labelColor;
    ctx.lineWidth = 1.5;
    
    // X axis labels
    for (let x = startX; x <= config.xRange[1]; x += config.gridStep) {
        if (x !== 0) { // Skip origin to avoid clutter
            const cx = mathToCanvasX(x);
            // Tick
            ctx.beginPath();
            ctx.moveTo(cx, originY - 4);
            ctx.lineTo(cx, originY + 4);
            ctx.stroke();
            // Label
            ctx.fillText(x.toString(), cx, originY + 18);
        }
    }
    
    // Y axis labels
    for (let y = startY; y <= config.yRange[1]; y += config.gridStep) {
        if (y !== 0) {
            const cy = mathToCanvasY(y);
            // Tick
            ctx.beginPath();
            ctx.moveTo(originX - 4, cy);
            ctx.lineTo(originX + 4, cy);
            ctx.stroke();
            // Label
            ctx.textAlign = 'right';
            ctx.fillText(y.toString(), originX - 10, cy);
            ctx.textAlign = 'center'; // Reset for next iterations
        }
    }
    
    // Origin label
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('0', originX - 8, originY + 8);
    
    // Reset alignment
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
}

function drawCurve() {
    if (state.points.length === 0) return;
    
    ctx.strokeStyle = config.curveColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    
    // Shadow for a subtle glow effect
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    
    const firstPoint = state.points[0];
    ctx.moveTo(mathToCanvasX(firstPoint.x), mathToCanvasY(firstPoint.y));
    
    for (let i = 1; i < state.points.length; i++) {
        const pt = state.points[i];
        ctx.lineTo(mathToCanvasX(pt.x), mathToCanvasY(pt.y));
    }
    
    ctx.stroke();
    
    // Reset shadow so it doesn't affect other elements
    ctx.shadowBlur = 0;
}

function drawAnimatedPoint() {
    if (state.points.length === 0) return;
    
    const lastPoint = state.points[state.points.length - 1];
    const cx = mathToCanvasX(lastPoint.x);
    const cy = mathToCanvasY(lastPoint.y);
    
    // Point inner circle
    ctx.fillStyle = config.pointColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Point outer ring
    ctx.strokeStyle = config.curveColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
}

function drawFrame() {
    drawGridAndAxes();
    drawCurve();
    drawAnimatedPoint();
}

// --- Animation Loop ---
function animate() {
    if (!state.isPlaying) return;
    
    if (state.currentX <= config.xRange[1]) {
        // Evaluate the function at the current x coordinate
        const y = evaluateFunction(state.currentX);
        state.points.push({ x: state.currentX, y: y });
        
        // Progress X based on speed
        state.currentX += state.speed;
        
        drawFrame();
        
        // Request next frame
        state.animationFrameId = requestAnimationFrame(animate);
    } else {
        // Animation reached the end
        state.isPlaying = false;
        drawFrame(); // Final draw to ensure it's rendered exactly at the end
    }
}

// --- UI Controls ---
function play() {
    if (!state.isPlaying && state.currentX <= config.xRange[1]) {
        state.isPlaying = true;
        animate();
    }
}

function pause() {
    state.isPlaying = false;
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
    }
}

function reset() {
    pause();
    state.currentX = config.xRange[0];
    state.points = [];
    state.isPlaying = false;
    drawFrame();
}

function updateSpeed() {
    // Map slider (1-10) to a reasonable math unit step per frame (e.g., 0.01 to 0.2)
    const sliderVal = parseInt(speedSlider.value, 10);
    state.speed = sliderVal * 0.015;
}

// --- Initialization ---
function init() {
    // Bind events
    window.addEventListener('resize', resizeCanvas);
    
    btnPlay.addEventListener('click', play);
    btnPause.addEventListener('click', pause);
    btnReset.addEventListener('click', reset);
    
    speedSlider.addEventListener('input', updateSpeed);
    
    // Setup initial state
    updateSpeed();
    resizeCanvas(); // This triggers the first drawFrame
    
    // Auto-start animation
    play();
}

// Start the application
init();
