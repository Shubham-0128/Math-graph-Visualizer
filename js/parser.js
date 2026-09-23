// Extract raw parts by splitting by comma for parametric, or handling raw strings
export function normalizeInput(str) {
    let clean = str.trim();
    // No longer aggressively strip 'y = ' because it could be 'x = ' or parametric
    return clean;
}

export function parseInput(raw) {
    const clean = normalizeInput(raw);
    
    // Check if parametric (comma separated)
    if (clean.includes(',') && !clean.includes('=')) {
        // Might be just `cos(t), sin(t)` without x= y=
        const parts = clean.split(',').map(s => s.trim());
        if (parts.length === 2) {
            return {
                relations: [
                    { lhs: 'x', rhs: parts[0] },
                    { lhs: 'y', rhs: parts[1] }
                ]
            };
        }
    }
    
    if (clean.includes(',')) {
        const parts = clean.split(',').map(s => s.trim());
        if (parts.length === 2 && parts[0].includes('=') && parts[1].includes('=')) {
            const p1 = parts[0].split('=');
            const p2 = parts[1].split('=');
            return {
                relations: [
                    { lhs: p1[0].trim(), rhs: p1[1].trim() },
                    { lhs: p2[0].trim(), rhs: p2[1].trim() }
                ]
            };
        }
    }
    
    // Inequalities
    const ineqMatch = clean.match(/^(.*?)(<=|>=|<|>)(.*)$/);
    if (ineqMatch) {
        return {
            relations: [{
                lhs: ineqMatch[1].trim(),
                op: ineqMatch[2],
                rhs: ineqMatch[3].trim()
            }]
        };
    }
    
    // Implicit or explicit equality
    if (clean.includes('=')) {
        const parts = clean.split('=');
        if (parts.length === 2) {
            return {
                relations: [{
                    lhs: parts[0].trim(),
                    op: '=',
                    rhs: parts[1].trim()
                }]
            };
        }
    }
    
    // Raw expression (e.g. `sin(x)`) -> assume y = f(x)
    return {
        relations: [{
            lhs: 'y',
            op: '=',
            rhs: clean
        }]
    };
}
