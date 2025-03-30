const Flags = require('./flags');

module.exports = {
    calculatePositionFromFlags(flag1, flag2, side) {
        const knownFlags = Flags;
        
        // Получаем реальные координаты флагов
        const f1 = knownFlags[flag1.name];
        const f2 = knownFlags[flag2.name];
        
        // Решение системы уравнений окружностей
        const A = (-2 * f1.x) + (2 * f2.x);
        const B = (-2 * f1.y) + (2 * f2.y);
        const C = Math.pow(f1.x, 2) + Math.pow(f1.y, 2) 
                - Math.pow(f2.x, 2) - Math.pow(f2.y, 2) 
                - Math.pow(flag1.distance, 2) + Math.pow(flag2.distance, 2);

        // Для вертикальных флагов (одинаковая X-координата)
        if (Math.abs(A) < 0.001) {
            const y = C / B;
            const x1 = Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(y - f1.y, 2)) + f1.x;
            const x2 = -Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(y - f1.y, 2)) + f1.x;
            
            return side === 'l' ? 
                { x: Math.min(x1, x2), y } : 
                { x: Math.max(x1, x2), y };
        }

        // Для горизонтальных флагов (одинаковая Y-координата)
        if (Math.abs(B) < 0.001) {
            const x = C / A;
            const y1 = Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(x - f1.x, 2)) + f1.y;
            const y2 = -Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(x - f1.x, 2)) + f1.y;
            
            return side === 'l' ? 
                { x, y: Math.min(y1, y2) } : 
                { x, y: Math.max(y1, y2) };
        }

        // Общий случай
        const x = C / A;
        const y1 = Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(x - f1.x, 2)) + f1.y;
        const y2 = -Math.sqrt(Math.pow(flag1.distance, 2) - Math.pow(x - f1.x, 2)) + f1.y;

        return side === 'l' ?
            { x, y: Math.min(y1, y2) } :
            { x, y: Math.max(y1, y2) };
    }
}



