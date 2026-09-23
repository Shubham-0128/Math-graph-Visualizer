// --- State and Configuration ---
const viewState = {
    offsetX: 0, // Math coordinate of the center X
    offsetY: 0, // Math coordinate of the center Y
    scale: 100, // Pixels per math unit (zoom level)
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastOffsetX: 0,
    lastOffsetY: 0
};

const animState = {
    isPlaying: true,
    speed: 5.0, // Math units to progress per second
    lastTime: performance.now(),
    frameId: null
};

let equations = []; // { id, rawText, parsedFn, color, visible, progressX, error }
let nextEqId = 1;

const config = {
    curveWidth: 2,
    gridMajor: '#2a2e37',
    gridMinor: '#1e2128',
    axisColor: '#475569',
    textColor: '#94a3b8',
    colors: ['#38bdf8', '#c084fc', '#fbbf24', '#34d399', '#f87171']
};

// --- DOM Elements ---
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
const container = document.querySelector('.graph-area');
const eqList = document.getElementById('equationList');
const template = document.getElementById('equationTemplate');
const btnAdd = document.getElementById('btnAddEquation');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnResetAnim = document.getElementById('btnResetAnim');
const btnResetView = document.getElementById('btnResetView');
const speedSlider = document.getElementById('speedSlider');

const crosshairX = document.getElementById('crosshairX');
const crosshairY = document.getElementById('crosshairY');
const coordOverlay = document.getElementById('coordOverlay');

// --- Coordinate Math ---
function getCanvasDims() {
    return {
        w: canvas.width / (window.devicePixelRatio || 1),
        h: canvas.height / (window.devicePixelRatio || 1)
    };
}

function mathToCanvasX(x) {
    const { w } = getCanvasDims();
    return (w / 2) + (x - viewState.offsetX) * viewState.scale;
}

function mathToCanvasY(y) {
    const { h } = getCanvasDims();
    // Y is flipped in canvas
    return (h / 2) - (y - viewState.offsetY) * viewState.scale;
}

function canvasToMathX(cx) {
    const { w } = getCanvasDims();
    return ((cx - (w / 2)) / viewState.scale) + viewState.offsetX;
}

function canvasToMathY(cy) {
    const { h } = getCanvasDims();
    return -((cy - (h / 2)) / viewState.scale) + viewState.offsetY;
}

function getVisibleMathRange() {
    const { w, h } = getCanvasDims();
    return {
        minX: canvasToMathX(0),
        maxX: canvasToMathX(w),
        minY: canvasToMathY(h),
        maxY: canvasToMathY(0)
    };
}

// --- View Interaction (Pan & Zoom) ---
container.addEventListener('pointerdown', (e) => {
    viewState.isDragging = true;
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
    viewState.lastOffsetX = viewState.offsetX;
    viewState.lastOffsetY = viewState.offsetY;
    container.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (e) => {
    // Update crosshair
    const rect = canvas.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        
        crosshairX.style.display = 'block';
        crosshairY.style.display = 'block';
        coordOverlay.style.display = 'block';
        
        crosshairX.style.left = `${cx}px`;
        crosshairY.style.top = `${cy}px`;
        coordOverlay.style.left = `${cx}px`;
        coordOverlay.style.top = `${cy}px`;
        
        const mx = canvasToMathX(cx).toFixed(2);
        const my = canvasToMathY(cy).toFixed(2);
        coordOverlay.textContent = `(${mx}, ${my})`;
    } else {
        crosshairX.style.display = 'none';
        crosshairY.style.display = 'none';
        coordOverlay.style.display = 'none';
    }

    if (!viewState.isDragging) return;
    
    const dx = e.clientX - viewState.dragStartX;
    const dy = e.clientY - viewState.dragStartY;
    
    viewState.offsetX = viewState.lastOffsetX - (dx / viewState.scale);
    viewState.offsetY = viewState.lastOffsetY + (dy / viewState.scale); // Flipped
});

window.addEventListener('pointerup', () => {
    viewState.isDragging = false;
    container.style.cursor = 'grab';
});

container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    
    // Zoom around cursor
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const mathBeforeX = canvasToMathX(cx);
    const mathBeforeY = canvasToMathY(cy);
    
    if (direction > 0) {
        viewState.scale *= zoomFactor;
    } else {
        viewState.scale /= zoomFactor;
    }
    
    // Clamp scale to practical limits to prevent float overflow/underflow
    viewState.scale = Math.max(1, Math.min(viewState.scale, 10000));
    
    const mathAfterX = canvasToMathX(cx);
    const mathAfterY = canvasToMathY(cy);
    
    viewState.offsetX -= (mathAfterX - mathBeforeX);
    viewState.offsetY -= (mathAfterY - mathBeforeY);
});

btnResetView.addEventListener('click', () => {
    viewState.offsetX = 0;
    viewState.offsetY = 0;
    viewState.scale = 100;
});

// --- Equation Management ---
function normalizeEquation(str) {
    let clean = str.trim();
    if (clean.toLowerCase().startsWith('y =') || clean.toLowerCase().startsWith('y=')) {
        clean = clean.substring(clean.indexOf('=') + 1).trim();
    }
    return clean;
}

function parseEquation(eq) {
    if (!eq.rawText) {
        eq.parsedFn = null;
        eq.error = false;
        return;
    }
    
    const normalized = normalizeEquation(eq.rawText);
    try {
        const node = math.parse(normalized);
        eq.parsedFn = node.compile();
        eq.error = false;
    } catch (e) {
        eq.parsedFn = null;
        eq.error = true;
    }
}

function addEquation(rawText = '') {
    const id = nextEqId++;
    const color = config.colors[(id - 1) % config.colors.length];
    
    const eq = {
        id,
        rawText,
        parsedFn: null,
        color,
        visible: true,
        progressX: getVisibleMathRange().minX, // Start animating from left of screen
        error: false
    };
    
    parseEquation(eq);
    equations.push(eq);
    renderEquationList();
}

function removeEquation(id) {
    equations = equations.filter(eq => eq.id !== id);
    renderEquationList();
}

function renderEquationList() {
    eqList.innerHTML = '';
    
    equations.forEach(eq => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector('.equation-item');
        const input = clone.querySelector('.eq-input');
        const colorInput = clone.querySelector('.eq-color');
        const btnToggle = clone.querySelector('.eq-toggle');
        const btnRemove = clone.querySelector('.eq-remove');
        
        if (eq.error) item.classList.add('has-error');
        
        input.value = eq.rawText;
        colorInput.value = eq.color;
        
        if (!eq.visible) {
            btnToggle.querySelector('.icon-visible').style.display = 'none';
            btnToggle.querySelector('.icon-hidden').style.display = 'block';
            input.style.opacity = '0.5';
        }
        
        input.addEventListener('input', (e) => {
            eq.rawText = e.target.value;
            parseEquation(eq);
            if (eq.error) item.classList.add('has-error');
            else item.classList.remove('has-error');
        });
        
        colorInput.addEventListener('input', (e) => {
            eq.color = e.target.value;
        });
        
        btnToggle.addEventListener('click', () => {
            eq.visible = !eq.visible;
            renderEquationList();
        });
        
        btnRemove.addEventListener('click', () => removeEquation(eq.id));
        
        eqList.appendChild(clone);
    });
}

// --- Presets ---
const presets = [
    { label: 'sin(x)', eq: 'sin(x)' },
    { label: 'x²', eq: 'x^2' },
    { label: 'e^(-x²)', eq: 'e^(-x^2)' },
    { label: 'tan(x)', eq: 'tan(x)' }
];

const presetList = document.getElementById('presetList');
presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = p.label;
    btn.addEventListener('click', () => addEquation(p.eq));
    presetList.appendChild(btn);
});

btnAdd.addEventListener('click', () => addEquation(''));

// --- Rendering ---
function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);

function getAdaptiveGridStep(scale) {
    // Want grid lines every ~50-100 pixels
    const targetPx = 80;
    const rawStep = targetPx / scale;
    // Round to nearest 1, 2, 5 * 10^n
    const p = Math.floor(Math.log10(rawStep));
    const normalized = rawStep / Math.pow(10, p);
    
    let step;
    if (normalized < 1.5) step = 1;
    else if (normalized < 3.5) step = 2;
    else if (normalized < 7.5) step = 5;
    else step = 10;
    
    return step * Math.pow(10, p);
}

function drawGridAndAxes() {
    const { w, h } = getCanvasDims();
    ctx.clearRect(0, 0, w, h);
    
    const { minX, maxX, minY, maxY } = getVisibleMathRange();
    
    const step = getAdaptiveGridStep(viewState.scale);
    
    ctx.font = '10px "SFMono-Regular", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Draw minor/major grid
    ctx.beginPath();
    ctx.strokeStyle = config.gridMinor;
    ctx.lineWidth = 1;
    
    const startX = Math.floor(minX / step) * step;
    for (let x = startX; x <= maxX; x += step) {
        const cx = mathToCanvasX(x);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
    }
    
    const startY = Math.floor(minY / step) * step;
    for (let y = startY; y <= maxY; y += step) {
        const cy = mathToCanvasY(y);
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
    }
    ctx.stroke();
    
    // Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = config.axisColor;
    ctx.lineWidth = 1.5;
    
    const originY = mathToCanvasY(0);
    if (originY >= 0 && originY <= h) {
        ctx.moveTo(0, originY);
        ctx.lineTo(w, originY);
    }
    
    const originX = mathToCanvasX(0);
    if (originX >= 0 && originX <= w) {
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, h);
    }
    ctx.stroke();
    
    // Draw Labels
    ctx.fillStyle = config.textColor;
    for (let x = startX; x <= maxX; x += step) {
        if (Math.abs(x) < 1e-10) continue; // Skip origin
        const cx = mathToCanvasX(x);
        // Determine precision based on step
        const dec = step < 1 ? -Math.floor(Math.log10(step)) : 0;
        ctx.fillText(x.toFixed(dec), cx, Math.min(Math.max(originY + 5, 5), h - 15));
    }
    
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = startY; y <= maxY; y += step) {
        if (Math.abs(y) < 1e-10) continue;
        const cy = mathToCanvasY(y);
        const dec = step < 1 ? -Math.floor(Math.log10(step)) : 0;
        ctx.fillText(y.toFixed(dec), Math.min(Math.max(originX - 5, 25), w - 5), cy);
    }
}

function drawEquations() {
    const { w, h } = getCanvasDims();
    const { minX, maxX } = getVisibleMathRange();
    const dx = (maxX - minX) / w; // 1 screen pixel step in math units
    
    equations.forEach(eq => {
        if (!eq.visible || !eq.parsedFn) return;
        
        ctx.beginPath();
        ctx.strokeStyle = eq.color;
        ctx.lineWidth = config.curveWidth;
        ctx.lineJoin = 'round';
        
        let isFirst = true;
        let lastY = 0;
        
        // Render up to the progress edge OR the max visible bound
        const renderMaxX = Math.min(maxX, eq.progressX);
        
        for (let x = minX; x <= renderMaxX; x += dx) {
            let y;
            try {
                y = eq.parsedFn.evaluate({ x });
            } catch (e) {
                continue; // Math error at this point, skip
            }
            
            // Discontinuity detection
            if (!isFinite(y) || typeof y !== 'number') {
                isFirst = true;
                continue;
            }
            
            // Detect insane vertical jumps (asymptotes)
            if (!isFirst && Math.abs(y - lastY) * viewState.scale > h) {
                isFirst = true;
            }
            
            const cx = mathToCanvasX(x);
            const cy = mathToCanvasY(y);
            
            if (isFirst) {
                ctx.moveTo(cx, cy);
                isFirst = false;
            } else {
                ctx.lineTo(cx, cy);
            }
            
            lastY = y;
        }
        ctx.stroke();
        
        // Draw Tracer at progress front (if within view)
        if (eq.progressX >= minX && eq.progressX <= maxX) {
            let traceY;
            try { traceY = eq.parsedFn.evaluate({ x: eq.progressX }); } catch (e) {}
            
            if (isFinite(traceY)) {
                const cx = mathToCanvasX(eq.progressX);
                const cy = mathToCanvasY(traceY);
                
                ctx.beginPath();
                ctx.fillStyle = '#fff';
                ctx.arc(cx, cy, 3, 0, Math.PI*2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.strokeStyle = eq.color;
                ctx.lineWidth = 2;
                ctx.arc(cx, cy, 6, 0, Math.PI*2);
                ctx.stroke();
            }
        }
    });
}

// --- Animation Loop ---
function updateAnimation(dt) {
    if (!animState.isPlaying) return;
    
    const { maxX } = getVisibleMathRange();
    
    equations.forEach(eq => {
        if (eq.progressX < maxX) {
            // Speed relies on current zoom scale to look consistent
            // speedSlider is 1-100. Let's make it intuitive regardless of scale.
            const speedFactor = parseInt(speedSlider.value, 10) / 50; // 0.02 to 2.0
            
            // 1 screen width = 1 second at 1x speed
            const viewWidthMath = getVisibleMathRange().maxX - getVisibleMathRange().minX;
            const step = (viewWidthMath * speedFactor) * dt; 
            
            eq.progressX += step;
            
            // Fast forward if progress fell way behind the left edge (panning far right)
            if (eq.progressX < getVisibleMathRange().minX) {
                eq.progressX = getVisibleMathRange().minX;
            }
        }
    });
}

function loop(timestamp) {
    const dt = (timestamp - animState.lastTime) / 1000; // seconds
    animState.lastTime = timestamp;
    
    updateAnimation(dt);
    
    drawGridAndAxes();
    drawEquations();
    
    animState.frameId = requestAnimationFrame(loop);
}

// --- Playback Controls ---
btnPlay.addEventListener('click', () => animState.isPlaying = true);
btnPause.addEventListener('click', () => animState.isPlaying = false);
btnResetAnim.addEventListener('click', () => {
    const { minX } = getVisibleMathRange();
    equations.forEach(eq => eq.progressX = minX);
    animState.isPlaying = true;
});

// --- Init ---
resizeCanvas();
addEquation('sin(x)');
animState.lastTime = performance.now();
animState.frameId = requestAnimationFrame(loop);
