import { parseInput } from './parser.js';

function getVariables(exprString) {
    try {
        const node = math.parse(exprString);
        const vars = new Set();
        node.traverse(n => {
            if (n.isSymbolNode && !math[n.name] && n.name !== 'pi' && n.name !== 'e') {
                vars.add(n.name);
            }
        });
        return Array.from(vars);
    } catch(e) {
        return [];
    }
}

export const EquationType = {
    EXPLICIT: 'EXPLICIT',
    VERTICAL: 'VERTICAL',
    IMPLICIT: 'IMPLICIT',
    PARAMETRIC: 'PARAMETRIC',
    POLAR: 'POLAR',
    INEQUALITY: 'INEQUALITY'
};

export function classifyAndCompile(raw) {
    const parsed = parseInput(raw);
    if (!parsed || !parsed.relations || parsed.relations.length === 0) {
        throw new Error("Invalid input");
    }
    
    const rels = parsed.relations;
    
    if (rels.length === 2) {
        // Potentially parametric
        const r1 = rels[0];
        const r2 = rels[1];
        if ((r1.lhs === 'x' && r2.lhs === 'y') || (r1.lhs === 'y' && r2.lhs === 'x')) {
            const xEq = r1.lhs === 'x' ? r1 : r2;
            const yEq = r1.lhs === 'y' ? r1 : r2;
            
            return {
                type: EquationType.PARAMETRIC,
                compiledX: math.compile(xEq.rhs),
                compiledY: math.compile(yEq.rhs)
            };
        }
    }
    
    if (rels.length === 1) {
        const r = rels[0];
        
        if (['<', '>', '<=', '>='].includes(r.op)) {
            return {
                type: EquationType.INEQUALITY,
                compiledF: math.compile(`(${r.lhs}) - (${r.rhs})`),
                op: r.op
            };
        }
        
        const lhsVars = getVariables(r.lhs);
        const rhsVars = getVariables(r.rhs);
        const allVars = new Set([...lhsVars, ...rhsVars]);
        
        // Polar
        if (r.lhs === 'r' && (allVars.has('theta') || allVars.has('t') || allVars.size === 0)) {
            return {
                type: EquationType.POLAR,
                compiledR: math.compile(r.rhs),
                param: allVars.has('t') ? 't' : 'theta'
            };
        }
        
        // Vertical: x = f(y)
        if (r.lhs === 'x' && !rhsVars.includes('x')) {
            return {
                type: EquationType.VERTICAL,
                compiledFn: math.compile(r.rhs)
            };
        }
        
        // Explicit: y = f(x)
        if (r.lhs === 'y' && !rhsVars.includes('y')) {
            return {
                type: EquationType.EXPLICIT,
                compiledFn: math.compile(r.rhs)
            };
        }
        
        // Implicit: F(x, y) = 0
        // Either lhs and rhs both have variables, or it's not a simple assignment
        return {
            type: EquationType.IMPLICIT,
            compiledF: math.compile(`(${r.lhs}) - (${r.rhs})`)
        };
    }
    
    throw new Error("Unable to classify equation");
}
