import { getCanvasDims, getVisibleMathRange, mathToCanvasX, mathToCanvasY, viewState, config } from './graph.js';

// Marching Squares Lookup Table for segments
// Each entry is an array of segments (pairs of edge indices)
// Edges: 0: Top, 1: Right, 2: Bottom, 3: Left
const EDGE_TABLE = [
    [], // 0000
    [[3, 2]], // 0001 (BL)
    [[2, 1]], // 0010 (BR)
    [[3, 1]], // 0011 (BL, BR)
    [[1, 0]], // 0100 (TR)
    [[3, 2], [1, 0]], // 0101 (BL, TR) - ambiguous
    [[2, 0]], // 0110 (BR, TR)
    [[3, 0]], // 0111
    [[0, 3]], // 1000 (TL)
    [[0, 2]], // 1001 (TL, BL)
    [[0, 3], [2, 1]], // 1010 (TL, BR) - ambiguous
    [[0, 1]], // 1011
    [[1, 3]], // 1100
    [[1, 2]], // 1101
    [[2, 3]], // 1110
    [] // 1111
];

function interpolate(v1, v2) {
    if (Math.abs(v1 - v2) < 1e-10) return 0.5;
    return (0 - v1) / (v2 - v1);
}

export function renderImplicit(eq, ctx) {
    const { minX, maxX, minY, maxY } = getVisibleMathRange();
    const { w, h } = getCanvasDims();
    
    // Choose grid resolution. We want maybe ~150-200 cells across the screen for detail.
    const resX = 150;
    const resY = Math.floor(resX * (h / w));
    
    const dx = (maxX - minX) / resX;
    const dy = (maxY - minY) / resY;
    
    // Evaluate grid
    const values = new Float32Array((resX + 1) * (resY + 1));
    for (let j = 0; j <= resY; j++) {
        const y = minY + j * dy;
        for (let i = 0; i <= resX; i++) {
            const x = minX + i * dx;
            try {
                const val = eq.compiled.compiledF.evaluate({x, y});
                values[j * (resX + 1) + i] = isFinite(val) ? val : NaN;
            } catch (e) {
                values[j * (resX + 1) + i] = NaN;
            }
        }
    }
    
    ctx.beginPath();
    ctx.strokeStyle = eq.color;
    ctx.lineWidth = config.curveWidth;
    ctx.lineJoin = 'round';
    
    for (let j = 0; j < resY; j++) {
        for (let i = 0; i < resX; i++) {
            const idxTL = (j + 1) * (resX + 1) + i; // Top-Left (since Y goes up in math, j=resY is maxY)
            // Wait, j=0 is minY. In math, minY is bottom.
            // Let's map it logically:
            // j=0 -> minY (Bottom)
            // j+1 -> minY + dy (Top)
            
            const vBL = values[j * (resX + 1) + i];
            const vBR = values[j * (resX + 1) + (i + 1)];
            const vTL = values[(j + 1) * (resX + 1) + i];
            const vTR = values[(j + 1) * (resX + 1) + (i + 1)];
            
            if (isNaN(vBL) || isNaN(vBR) || isNaN(vTL) || isNaN(vTR)) continue;
            
            let cellIndex = 0;
            if (vTL < 0) cellIndex |= 8;
            if (vTR < 0) cellIndex |= 4;
            if (vBR < 0) cellIndex |= 2;
            if (vBL < 0) cellIndex |= 1;
            
            const edges = EDGE_TABLE[cellIndex];
            if (edges.length === 0) continue;
            
            // Get coordinates
            const xL = minX + i * dx;
            const xR = xL + dx;
            const yB = minY + j * dy;
            const yT = yB + dy;
            
            // Interpolate points
            // Edges: 0: Top, 1: Right, 2: Bottom, 3: Left
            const pts = [];
            if (cellIndex !== 0 && cellIndex !== 15) {
                pts[0] = { x: xL + interpolate(vTL, vTR) * dx, y: yT }; // Top
                pts[1] = { x: xR, y: yB + interpolate(vBR, vTR) * dy }; // Right
                pts[2] = { x: xL + interpolate(vBL, vBR) * dx, y: yB }; // Bottom
                pts[3] = { x: xL, y: yB + interpolate(vBL, vTL) * dy }; // Left
            }
            
            for (let e = 0; e < edges.length; e++) {
                const p1 = pts[edges[e][0]];
                const p2 = pts[edges[e][1]];
                
                if (p1 && p2) {
                    ctx.moveTo(mathToCanvasX(p1.x), mathToCanvasY(p1.y));
                    ctx.lineTo(mathToCanvasX(p2.x), mathToCanvasY(p2.y));
                }
            }
        }
    }
    ctx.stroke();
}
