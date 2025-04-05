module.exports = {
    squares_diff(x1, x2) {
        return x1 * x1 - x2 * x2
    },
    find_parameter(param, data) {
        for (const obj of data) {
            if (typeof obj === 'number') {
                continue;
            }
            if (obj['cmd'] === param) {
                return obj['p'];
            }
        }
    },
    see_object(obj_name, see_data) {
        /*
        Если объект не виден, возвращает null.
        Если объект виден, возвращает пространственные характеристики
        в формате [Distance, Direction, ...]
        */
        for (const obj of see_data) {
            if (typeof obj === 'number') {
                continue;
            }
            let cur_obj_name = obj['cmd']['p'].join('');
            if (cur_obj_name === obj_name && obj_name !== 'p') {
                return obj['p'];
            } else if (obj_name === 'p' && cur_obj_name.includes(obj_name) && !cur_obj_name.includes("f") && cur_obj_name.includes("A")) {
                return obj['p'];
            }
        }
        return null;
    },

    seeBottomFlags(p) {
        for (const obj of p) {
            if (typeof obj === 'number') {
                continue;
            }
            let cur_obj_name = obj['cmd']['p'].join('');
            if (cur_obj_name[0] === 'f' && cur_obj_name.includes('b')) {
                return true
            }
        }
        return false;
    },

    // Трапециевидная функция принадлежности
    trapezoidMF(x, [a, b, c, d]) {
        return Math.max(0, Math.min(
            (x - a) / (b - a || 1e-5),
            1,
            (d - x) / (d - c || 1e-5)
        ));
    },

    // Треугольная функция принадлежности
    triangleMF(x, [a, b, c]) {
        return Math.max(0, Math.min(
            (x - a) / (b - a || 1e-5),
            (c - x) / (c - b || 1e-5)
        ));
    },

    distance: (a, b) => {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    },
    
    calculateAngle: (from, to) => {
        return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    },
    
    normalizeAngle: (angle) => {
        while(angle > 180) angle -= 360;
        while(angle < -180) angle += 360;
        return angle;
    }
}