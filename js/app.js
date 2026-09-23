import { viewState, config, getVisibleMathRange, drawGridAndAxes, canvasToMathX, canvasToMathY } from './graph.js';
import { classifyAndCompile, EquationType } from './classifier.js';
import { renderEquation } from './renderer.js';

let equations = [];
let nextEqId = 1;

const animState = {
    isPlaying: true,
    speed: 5.0,
    lastTime: performance.now(),
    frameId: null
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

viewState.canvas = canvas;
viewState.ctx = ctx;
viewState.container = container;

// --- View Interaction ---
container.addEventListener('pointerdown', (e) => {
    viewState.isDragging = true;
    viewState.dragStartX = e.clientX;
    viewState.dragStartY = e.clientY;
    viewState.lastOffsetX = viewState.offsetX;
    viewState.lastOffsetY = viewState.offsetY;
    container.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (e) => {
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
    viewState.offsetY = viewState.lastOffsetY + (dy / viewState.scale);
});

window.addEventListener('pointerup', () => {
    viewState.isDragging = false;
    container.style.cursor = 'grab';
});

container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const mathBeforeX = canvasToMathX(cx);
    const mathBeforeY = canvasToMathY(cy);
    
    if (direction > 0) viewState.scale *= zoomFactor;
    else viewState.scale /= zoomFactor;
    
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
function updateEquation(eq) {
    if (!eq.rawText) {
        eq.compiled = null;
        eq.error = false;
        return;
    }
    try {
        const compiled = classifyAndCompile(eq.rawText);
        eq.compiled = compiled;
        eq.type = compiled.type;
        eq.error = false;
        // Reset animation state
        const range = getVisibleMathRange();
        eq.progressX = range.minX;
        eq.progressY = range.minY;
        eq.progress = 0;
    } catch (e) {
        eq.compiled = null;
        eq.error = true;
    }
}

function addEquation(rawText = '') {
    const id = nextEqId++;
    const color = config.colors[(id - 1) % config.colors.length];
    const range = getVisibleMathRange();
    
    const eq = {
        id,
        rawText,
        type: null,
        compiled: null,
        color,
        visible: true,
        progressX: range.minX,
        progressY: range.minY,
        progress: 0, // 0 to 1 for parametric/polar/implicit reveal
        error: false
    };
    
    updateEquation(eq);
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
            updateEquation(eq);
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
    { label: 'sin(x)', eq: 'y = sin(x)' },
    { label: 'Heart', eq: '(x^2 + y^2 - 1)^3 = x^2*y^3' },
    { label: 'Circle', eq: 'x^2 + y^2 = 25' },
    { label: 'Para. Heart', eq: 'x = 16sin(t)^3, y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)' },
    { label: 'Polar', eq: 'r = 1 + cos(theta)' }
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

// --- Animation & Loop ---
function updateAnimation(dt) {
    if (!animState.isPlaying) return;
    
    const range = getVisibleMathRange();
    const speedFactor = parseInt(speedSlider.value, 10) / 50; 
    
    equations.forEach(eq => {
        if (!eq.compiled) return;
        
        if (eq.type === EquationType.EXPLICIT) {
            const step = ((range.maxX - range.minX) * speedFactor) * dt; 
            eq.progressX += step;
            if (eq.progressX < range.minX) eq.progressX = range.minX;
        } else if (eq.type === EquationType.VERTICAL) {
            const step = ((range.maxY - range.minY) * speedFactor) * dt; 
            eq.progressY += step;
            if (eq.progressY < range.minY) eq.progressY = range.minY;
        } else {
            // progress is 0 to 1
            const step = (0.5 * speedFactor) * dt;
            if (eq.progress < 1.0) {
                eq.progress += step;
            }
        }
    });
}

function loop(timestamp) {
    const dt = (timestamp - animState.lastTime) / 1000;
    animState.lastTime = timestamp;
    
    updateAnimation(dt);
    
    drawGridAndAxes();
    
    equations.forEach(eq => {
        renderEquation(eq, ctx);
    });
    
    animState.frameId = requestAnimationFrame(loop);
}

btnPlay.addEventListener('click', () => animState.isPlaying = true);
btnPause.addEventListener('click', () => animState.isPlaying = false);
btnResetAnim.addEventListener('click', () => {
    const range = getVisibleMathRange();
    equations.forEach(eq => {
        eq.progressX = range.minX;
        eq.progressY = range.minY;
        eq.progress = 0;
    });
    animState.isPlaying = true;
});

// --- Init ---
function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
addEquation('y = x^2');
animState.lastTime = performance.now();
animState.frameId = requestAnimationFrame(loop);
