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
}

export function renderEquation(eq, ctx) {
    if (!eq.visible || !eq.compiled) return;
    
    // Handle animation clip/reveal based on type, or just draw
    switch (eq.type) {
        case EquationType.EXPLICIT:
            renderExplicit(eq, ctx);
            break;
        case EquationType.VERTICAL:
            renderVertical(eq, ctx);
            break;
        case EquationType.IMPLICIT:
            // For implicit, animation is a radius clip mask, but let's just do an opacity fade or global clip
            ctx.save();
            if (eq.progress < 1) {
                const { w, h } = getCanvasDims();
                ctx.beginPath();
                // Reveal from center outwards as a circle
                ctx.arc(w/2, h/2, Math.max(w, h) * eq.progress, 0, Math.PI * 2);
                ctx.clip();
            }
            renderImplicit(eq, ctx);
            ctx.restore();
            break;
        case EquationType.PARAMETRIC:
            renderParametric(eq, ctx);
            break;
        case EquationType.POLAR:
            renderPolar(eq, ctx);
            break;
    }
}
