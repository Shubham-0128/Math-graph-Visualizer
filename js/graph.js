export const viewState = {
    offsetX: 0,
    offsetY: 0,
    scale: 100,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastOffsetX: 0,
    lastOffsetY: 0,
    canvas: null,
    ctx: null,
    container: null
};

export const config = {
    curveWidth: 2,
    gridMajor: 'rgba(255, 255, 255, 0.08)',
    gridMinor: 'rgba(255, 255, 255, 0.03)',
    axisColor: 'rgba(255, 255, 255, 0.25)',
    textColor: '#64748b',
    colors: ['#38bdf8', '#c084fc', '#fbbf24', '#34d399', '#f87171']
};

export function getCanvasDims() {
    return {
        w: viewState.canvas.width / (window.devicePixelRatio || 1),
        h: viewState.canvas.height / (window.devicePixelRatio || 1)
    };
}

export function mathToCanvasX(x) {
    const { w } = getCanvasDims();
    return (w / 2) + (x - viewState.offsetX) * viewState.scale;
}

export function mathToCanvasY(y) {
    const { h } = getCanvasDims();
    return (h / 2) - (y - viewState.offsetY) * viewState.scale;
}

export function canvasToMathX(cx) {
    const { w } = getCanvasDims();
    return ((cx - (w / 2)) / viewState.scale) + viewState.offsetX;
}

export function canvasToMathY(cy) {
    const { h } = getCanvasDims();
    return -((cy - (h / 2)) / viewState.scale) + viewState.offsetY;
}

export function getVisibleMathRange() {
    const { w, h } = getCanvasDims();
    return {
        minX: canvasToMathX(0),
        maxX: canvasToMathX(w),
        minY: canvasToMathY(h),
        maxY: canvasToMathY(0)
    };
}

function getAdaptiveGridStep(scale) {
    const targetPx = 80;
    const rawStep = targetPx / scale;
    const p = Math.floor(Math.log10(rawStep));
    const normalized = rawStep / Math.pow(10, p);
    
    let step;
    if (normalized < 1.5) step = 1;
    else if (normalized < 3.5) step = 2;
    else if (normalized < 7.5) step = 5;
    else step = 10;
    
    return step * Math.pow(10, p);
}

export function drawGridAndAxes() {
    const { ctx } = viewState;
    const { w, h } = getCanvasDims();
    ctx.clearRect(0, 0, w, h);
    
    const { minX, maxX, minY, maxY } = getVisibleMathRange();
    const step = getAdaptiveGridStep(viewState.scale);
    
    ctx.font = '10px "SFMono-Regular", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
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
    
    ctx.fillStyle = config.textColor;
    for (let x = startX; x <= maxX; x += step) {
        if (Math.abs(x) < 1e-10) continue;
        const cx = mathToCanvasX(x);
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
