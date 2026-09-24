import { getVisibleMathRange, getCanvasDims, mathToCanvasX, mathToCanvasY, viewState, config } from './graph.js';
import { EquationType } from './classifier.js';
import { renderImplicit } from './implicit.js';
import { renderParametric } from './parametric.js';
import { renderPolar } from './polar.js';

function renderExplicit(eq, ctx) {
    const { w, h } = getCanvasDims();
    const { minX, maxX } = getVisibleMathRange();
    const dx = (maxX - minX) / w;
    
    ctx.beginPath();
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = config.curveWidth;
    ctx.lineJoin = 'round';
    
    let isFirst = true;
    let lastY = 0;
    
    const renderMaxX = Math.min(maxX, eq.progressX);
    
    for (let x = minX; x <= renderMaxX; x += dx) {
        let y;
        try {
            y = eq.compiled.compiledFn.evaluate({ x });
        } catch (e) {
            isFirst = true;
            continue;
        }
        
        if (!isFinite(y) || typeof y !== 'number') {
            isFirst = true;
            continue;
        }
        
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
    
    // Draw Tracer
    if (eq.progressX >= minX && eq.progressX <= maxX) {
        let traceY;
        try { traceY = eq.compiled.compiledFn.evaluate({ x: eq.progressX }); } catch (e) {}
        
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
}

function renderVertical(eq, ctx) {
    const { w, h } = getCanvasDims();
    const { minY, maxY } = getVisibleMathRange();
    const dy = (maxY - minY) / h;
    
    ctx.beginPath();
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = config.curveWidth;
    ctx.lineJoin = 'round';
    
    let isFirst = true;
    let lastX = 0;
    
    // Animate from bottom to top
    const renderMaxY = Math.min(maxY, eq.progressY);
    
    for (let y = minY; y <= renderMaxY; y += dy) {
        let x;
        try {
            x = eq.compiled.compiledFn.evaluate({ y });
        } catch (e) {
            isFirst = true;
            continue;
        }
        
        if (!isFinite(x) || typeof x !== 'number') {
            isFirst = true;
            continue;
        }
        
        if (!isFirst && Math.abs(x - lastX) * viewState.scale > w) {
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
        
        lastX = x;
    }
    ctx.stroke();

    // Draw Tracer
    if (eq.progressY >= minY && eq.progressY <= maxY) {
        let traceX;
        try { traceX = eq.compiled.compiledFn.evaluate({ y: eq.progressY }); } catch (e) {}
        
        if (isFinite(traceX)) {
            const cx = mathToCanvasX(traceX);
            const cy = mathToCanvasY(eq.progressY);
            
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
}

export function renderEquation(eq, ctx, isActive = false) {
    if (!eq.visible || !eq.compiled) return;
    
    ctx.save();
    
    if (isActive) {
        ctx.shadowColor = eq.color;
        ctx.shadowBlur = 15;
    }
    
    // Handle animation clip/reveal based on type, or just draw
    switch (eq.type) {
        case EquationType.EXPLICIT:
            renderExplicit(eq, ctx);
            break;
        case EquationType.VERTICAL:
            renderVertical(eq, ctx);
            break;
        case EquationType.IMPLICIT:
            if (eq.progress < 1) {
                const { w, h } = getCanvasDims();
                ctx.beginPath();
                ctx.arc(w/2, h/2, Math.max(w, h) * eq.progress, 0, Math.PI * 2);
                ctx.clip();
            }
            renderImplicit(eq, ctx);
            break;
        case EquationType.PARAMETRIC:
            renderParametric(eq, ctx);
            break;
        case EquationType.POLAR:
            renderPolar(eq, ctx);
            break;
    }
    
    ctx.restore();
}
