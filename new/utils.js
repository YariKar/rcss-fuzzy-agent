const Flags = require('./flags');

// utils.js
module.exports = {
    // Преобразование градусов в радианы
    deg2rad: (degrees) => degrees * Math.PI / 180,

    polarToCartesian: (distance, angleDegrees) => {
        const angleRad = module.exports.deg2rad(angleDegrees);
        return {
            x: distance * Math.cos(angleRad),
            y: distance * Math.sin(angleRad)
        };
    },

    // Преобразование радиан в градусы
    rad2deg: (radians) => radians * 180 / Math.PI,

    // Расчет расстояния между двумя точками
    hypot: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),

    // Получение единичного вектора направления
    getUnitVector: (angleDegrees, directionOfSpeed = 0) => {
        const totalAngle = angleDegrees + directionOfSpeed;
        return {
            x: Math.cos(this.deg2rad(totalAngle)),
            y: Math.sin(this.deg2rad(totalAngle))
        };
    },

    // Проверка валидности числовых значений
    isValidNumber: (num) => !isNaN(num) && isFinite(num),

    // Решение системы уравнений для триангуляции
    solvePosition: (flags) => {
        if (flags.length < 2) return null;

        const [f1, f2] = flags.slice(0, 2);
        const k = (f2.y - f1.y) / (f2.x - f1.x);
        const b = f1.y - k * f1.x;

        return {
            x: (f1.distance ** 2 - f2.distance ** 2 + f2.x ** 2 - f1.x ** 2 + f2.y ** 2 - f1.y ** 2) / (2 * (f2.x - f1.x)),
            y: k * x + b
        };
    },

    // Нормализация угла в диапазон [-180, 180]
    normalizeAngle: (angle) => {
        let normalized = angle % 360;
        return normalized > 180 ? normalized - 360 : normalized;
    },

    // Расчет относительного угла до цели
    calculateRelativeAngle: (currentPos, targetPos) => {
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        return this.rad2deg(Math.atan2(dy, dx));
    }
};



