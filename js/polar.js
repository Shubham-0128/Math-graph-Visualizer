import { getCanvasDims, mathToCanvasX, mathToCanvasY, config } from './graph.js';

export function renderPolar(eq, ctx) {
    const minTheta = 0;
    const maxTheta = Math.PI * 12; // Allow multiple revolutions
    
    const steps = 2000;
    const dTheta = (maxTheta - minTheta) / steps;
    
    // eq.progress animates from 0 to 1
    const currentMaxTheta = minTheta + (maxTheta - minTheta) * eq.progress;
    
    ctx.beginPath();
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = config.curveWidth;
    ctx.lineJoin = 'round';
    
    let isFirst = true;
    for (let th = minTheta; th <= currentMaxTheta; th += dTheta) {
        let r;
        try {
            const scope = {};
            scope[eq.compiled.param] = th;
            r = eq.compiled.compiledR.evaluate(scope);
        } catch (e) {
            isFirst = true;
            continue;
        }
        
        if (!isFinite(r)) {
            isFirst = true;
            continue;
        }
        
        const x = r * Math.cos(th);
        const y = r * Math.sin(th);
        
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
}
