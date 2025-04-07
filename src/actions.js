const utils = require("./utils")
const calculations = require("./calculations")


module.exports = {

    positioning(taken) {
        const y = taken.state.pos?.y || taken.last_pos.pos.y
        const bottom = taken.bottom
        const top = taken.top
        if (y <= bottom && y >= top) {
            //TODO
            return { n: "turn", v: 30 };
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

    moveToBall(taken) {
        const angleDiff = taken.state.ball?.angle
        const ballDist = taken.state.ball?.dist
        const TURN_THRESHOLD = 15; // Порог для поворота

        if (Math.abs(angleDiff) > TURN_THRESHOLD) {
            return { n: "turn", v: angleDiff }
        }
        if (taken.state?.pos?.y < -45 || taken.state?.pos?.y > 45) {
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
        
        const minY = yCoords[0] + 1;
        const maxY = yCoords[yCoords.length - 1] - 1;
        console.log("RANDOM", minY, maxY)
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
    },

    pass(taken){
        const teammate = taken.last_seen_teammate;
    
        // 1. Если данные о партнере отсутствуют или недостаточны
        // if (!teammate || (!teammate.x && !teammate.angle)) {
        //     return { n: "kick", v: "40 0" }; // Пасс вперёд по умолчанию
        // }
    
        // 2. Расчет целевых координат
        let targetX, targetY, kickAngle;
        
        // Сценарий A: Есть точные координаты
        if (teammate.x !== null && teammate.y !== null) {
            targetX = teammate.x;
            targetY = teammate.y;
            kickAngle = calculations.calculateAngle(taken.state.pos, {x: targetX, y: targetY});
        }
        // Сценарий B: Есть расстояние и угол
        else if (teammate.dist !== null && teammate.angle !== null) {
            kickAngle = teammate.angle;
            targetX = taken.state.pos.x + teammate.dist * Math.cos(kickAngle * Math.PI / 180);
            targetY = taken.state.pos.y + teammate.dist * Math.sin(kickAngle * Math.PI / 180);
        }
        // Сценарий C: Только расстояние
        else if (teammate.dist !== null) {
            kickAngle = 0; // По умолчанию вперед
            targetX = taken.state.pos.x + teammate.dist;
            targetY = taken.state.pos.y;
        }
    
        // 3. Расчет силы удара
        const currentBallDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball);
        const targetDist = calculations.distance(taken.state.pos, {x: targetX, y: targetY});
        
        // Формула силы: базовое значение + коррекция на расстояние
        let kickPower = Math.min(100, 
            30 + // Базовое усилие
            (targetDist) + // Основная компонента расстояния
            (currentBallDist * 0.6) // Коррекция на текущую дистанцию до мяча
        );
        console.log("PASS", kickPower, targetDist, currentBallDist, taken.state.pos, taken.state.ball, targetX, targetY, teammate)
        // 4. Коррекция угла для точности
        const ANGLE_CORRECTION = 2.5; // Коэффициент точности
        const precision = Math.max(0.5, 1 - (targetDist / 100)); 
        kickAngle += (Math.random() - 0.5) * ANGLE_CORRECTION * (1 - precision);
    
        return {
            n: "kick",
            v: `${Math.round(kickPower)} ${kickAngle.toFixed(1)}`
        };
    },

    knock(taken){
        const DECOY_ANGLE = 45; // Угол для обмана
        const MAIN_ANGLE = -30; // Реальное направление
        
        return [
            { n: "turn", v: DECOY_ANGLE }, // Финт
            { n: "kick", v: "10 0" },       // Отвлекающий удар
            { n: "turn", v: MAIN_ANGLE },  // Реальный поворот
            { n: "dash", v: 100 },         // Рывок
            { n: "kick", v: "20 " + MAIN_ANGLE }
        ];
    }



}