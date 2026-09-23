import { getCanvasDims, mathToCanvasX, mathToCanvasY, config } from './graph.js';

export function renderParametric(eq, ctx) {
    const { w, h } = getCanvasDims();
    // Parametric domain typically 0 to 2PI, but for hearts it might need 0 to 2PI.
    // We'll use 0 to 2PI by default, but let's do -10 to 10 for generic safety, or 0 to 4PI to cover most closed loops
    const minT = -Math.PI * 4;
    const maxT = Math.PI * 4;
    
    // We want high resolution
    const steps = 1000;
    const dt = (maxT - minT) / steps;
    
    // Determine the max render bound based on progress
    // eq.progress animates from 0 to 1.
    const currentMaxT = minT + (maxT - minT) * eq.progress;
    
    ctx.beginPath();
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = config.curveWidth;
    ctx.lineJoin = 'round';
    
    let isFirst = true;
    for (let t = minT; t <= currentMaxT; t += dt) {
        let x, y;
        try {
            x = eq.compiled.compiledX.evaluate({ t });
            y = eq.compiled.compiledY.evaluate({ t });
        } catch (e) {
            isFirst = true;
            continue;
        }
        
        if (!isFinite(x) || !isFinite(y)) {
            isFirst = true;
            continue;
        }
        
        const cx = mathToCanvasX(x);
        const cy = mathToCanvasY(y);
        
        if (isFirst) {
            ctx.moveTo(cx, cy);
            isFirst = false;
        } else {
            ctx.lineTo(cx, cy);
        }
    }
    ctx.stroke();
    
    // Tracer
    if (eq.progress < 1.0) {
        try {
            const tx = eq.compiled.compiledX.evaluate({ t: currentMaxT });
            const ty = eq.compiled.compiledY.evaluate({ t: currentMaxT });
            if (isFinite(tx) && isFinite(ty)) {
                const cx = mathToCanvasX(tx);
                const cy = mathToCanvasY(ty);
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
        } catch (e) {}
    }
}
