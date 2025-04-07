const utils = require("./utils")
const calculations = require("./calculations")


module.exports = {

    positioning(taken) {
        const y = taken.state.pos?.y || taken.last_pos.pos.y
        const bottom = taken.bottom
        const top = taken.top
        if (y <= bottom && y >= top) {
            //TODO
            return { n: "turn", v: 10 };
        }
        let keys = Object.keys(taken.state.all_flags);
        for (const key of keys) {
            let flag = taken.state.all_flags[key];
            if (flag.y <= bottom && flag.y >= top) {
                if (Math.abs(flag.angle) > 5) {
                    return [{ n: "turn", v: flag.angle }, { n: "dash", v: 80 }];
                }
                return { n: "dash", v: 80 };
            }
        }
        return { n: "turn", v: 45 };
    },

    takeBall(taken) {

    },

    moveToBall(taken) {
        const angleDiff = taken.state.ball?.angle
        const ballDist = taken.state.ball?.dist
        const TURN_THRESHOLD = 15; // Порог для поворота

        if (Math.abs(angleDiff) > TURN_THRESHOLD) {
            return { n: "turn", v: angleDiff }
        }
        if (taken.state?.pos?.y < -45 || taken.state?.pos.y > 45) {
            return { n: "dash", v: 50 };
        }
        if (ballDist < 2) {
            return { n: "dash", v: 70 };
        }
        return { n: "dash", v: 100 };

        // const dashPower = Math.min(100, ballDist * 20); // Коэффициент скорости
        // return { n: "dash", v: dashPower }
    },

    shoot(taken) {
        const side = taken.side || "l";
        const goalFlags = side === "l"
            ? ["fgrt", "gr", "fgrb"]  // Правые ворота противника
            : ["fglt", "gl", "fglb"];  // Левые ворота противника

        // 1. Собираем все видимые флаги ворот
        const visibleFlags = Object.entries(taken.state.all_flags || {})
            .filter(([name]) => goalFlags.includes(name))
            .map(([_, data]) => data);

        // // 2. Если нет видимых флагов - бьем прямо вперед
        // if (visibleFlags.length === 0) {
        //     return { n: "kick", v: "100 0" };
        // }

        // 3. Определяем границы ворот
        const yCoords = visibleFlags.map(flag => flag.y).sort((a, b) => a - b);
        const minY = yCoords[0];
        const maxY = yCoords[yCoords.length - 1];

        // 4. Генерируем случайную цель между флагами
        const targetY = minY + Math.random() * (maxY - minY);
        const target = {
            x: visibleFlags[0].x,  // X одинаков для всех флагов ворот
            y: targetY
        };

        // 5. Рассчитываем угол удара
        const angleToTarget = calculations.calculateAngle(taken.state.pos, target);

        return {
            n: "kick",
            v: `100 ${angleToTarget.toFixed(1)}`
        };
    },

    dribbling(taken) {
        const side = taken.side || "l";
        const goalFlags = side === "l"
            ? ["gr", "fgrt", "fgrb"]  // Правые ворота
            : ["gl", "fglt", "fglb"]; // Левые ворота

        // 2. Находим ближайший видимый флаг ворот
        const goalFlag = Object.entries(taken.state.all_flags || {})
            .filter(([name]) => goalFlags.includes(name))
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => a.dist - b.dist)[0];

        // 4. Рассчитываем целевой угол для доворота
        const targetAngle = goalFlag.angle;
        const angleThreshold = 5; // Порог доворота в градусах
        const maxTurnAngle = 20
        // 5. Если нужен доворот
        if (Math.abs(targetAngle) > angleThreshold) {
            return {
                n: "turn",
                v: Math.min(targetAngle, maxTurnAngle)
            };
        }

        // 6. Расчет силы удара (0-30%) на основе расстояния до ворот
        const kickPower = Math.min(30, Math.max(10,
            Math.round(goalFlag.dist * 0.5))
        );

        // 7. Удар с небольшим смещением вперед
        return {
            n: "kick",
            v: `${kickPower} ${targetAngle}`
        };
    },

    ballTurn(taken) {

        const side = taken.side; // 'l' или 'r'
        const flags = taken.state.all_flags || {};

        // Счетчики флагов верхней и нижней частей поля
        let topCount = 0;
        let bottomCount = 0;
        
        // Анализируем видимые флаги
        Object.values(flags).forEach(flag => {
            if (flag.y < -5) { // Верхняя часть поля (Y отрицательный)
                topCount++;
            }
            else if (flag.y > 5) { // Нижняя часть поля (Y положительный)
                bottomCount++;
            }
        });
        console.log("BALL TURN ", flags, side, topCount, bottomCount)
        // Определение направления поворота
        let turnAngle;
        if (side === 'l') {
            turnAngle = topCount > bottomCount ? 60 : -60;
        } else {
            turnAngle = topCount > bottomCount ? -60 : 60;
        }

        return { n: "kick", v: `5 ${turnAngle}` };
    }

}