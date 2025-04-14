const utils = require("./utils")
const calculations = require("./calculations")


module.exports = {

    positioning_old(taken) {
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
    positioning(taken) {
        // Параметры поля (должны соответствовать серверу RCSS)
        const FIELD = {
            width: 105,
            height: 68,
            margin: 5, // Безопасная зона от краев
            penaltyArea: {
                width: 16.5,
                depth: 40.3
            }
        };
    
        // Получаем последние известные позиции
        const currentPos = taken.state.pos || taken.last_pos?.pos || { 
            x: taken.start_x, 
            y: Math.min(taken.top, Math.max(taken.bottom, taken.start_y))
        };
    
        // Определяем границы безопасной зоны
        const safeBoundary = {
            minX: -FIELD.width/2 + FIELD.margin,
            maxX: FIELD.width/2 - FIELD.margin,
            minY: -FIELD.height/2 + FIELD.margin,
            maxY: FIELD.height/2 - FIELD.margin
        };
    
        // Функция для коррекции позиции в пределах поля
        const clampPosition = (pos) => ({
            x: Math.min(safeBoundary.maxX, Math.max(safeBoundary.minX, pos.x)),
            y: Math.min(safeBoundary.maxY, Math.max(safeBoundary.minY, pos.y))
        });
    
        // Базовые позиции с учетом границ
        const strategicPositions = {
            defender: clampPosition({
                x: taken.side === "l" ? -FIELD.width/2 + 15 : FIELD.width/2 - 15,
                y: currentPos.y * 0.5
            }),
            midfielder: clampPosition({
                x: (taken.state.ball?.x || 0) * 0.7,
                y: currentPos.y * 0.3
            }),
            attacker: clampPosition({
                x: taken.side === "l" ? FIELD.width/4 : -FIELD.width/4,
                y: 0
            })
        };
    
        // Выбор стратегии позиционирования
        let targetPos;
        if(taken.state.ball) {
            const ballX = taken.state.ball.x;
            const isDefense = (taken.side === "l" && ballX < -30) || 
                             (taken.side === "r" && ballX > 30);
            
            targetPos = isDefense ? strategicPositions.defender : 
                (Math.abs(ballX) < 30 ? strategicPositions.midfielder : 
                                       strategicPositions.attacker);
        } else {
            targetPos = clampPosition({
                x: taken.start_x,
                y: taken.start_y
            });
        }
    
        // Коррекция конечной позиции
        targetPos = clampPosition(targetPos);
    
        // Поиск безопасных флагов
        const safeFlags = Object.values(taken.state.all_flags || {})
            .filter(flag => {
                const flagPos = utils.parseFlagPosition(flag.name);
                return flagPos.x >= safeBoundary.minX && 
                       flagPos.x <= safeBoundary.maxX &&
                       flagPos.y >= safeBoundary.minY && 
                       flagPos.y <= safeBoundary.maxY;
            });
    
        // Если есть безопасные флаги - используем их
        if(safeFlags.length > 0) {
            const nearestSafeFlag = safeFlags.reduce((closest, flag) => 
                flag.dist < closest.dist ? flag : closest, 
                {dist: Infinity});
    
            if(nearestSafeFlag.dist > 3) {
                return [
                    {n: "turn", v: nearestSafeFlag.angle},
                    {n: "dash", v: Math.min(70, nearestSafeFlag.dist * 1.5)}
                ];
            }
        }
    
        // Расчет движения к целевой позиции
        const angleToTarget = calculations.calculateAngle(currentPos, targetPos);
        const distanceToTarget = calculations.distance(currentPos, targetPos);
    
        // Определяем граничные условия
        const isNearBoundary = 
            currentPos.x <= safeBoundary.minX + 3 || 
            currentPos.x >= safeBoundary.maxX - 3 ||
            currentPos.y <= safeBoundary.minY + 3 || 
            currentPos.y >= safeBoundary.maxY - 3;
    
        // Если близко к границе - двигаемся к центру
        if(isNearBoundary) {
            const centerPos = clampPosition({
                x: 0,
                y: currentPos.y > 0 ? -10 : 10
            });
            const angleToCenter = calculations.calculateAngle(currentPos, centerPos);
            return [
                {n: "turn", v: angleToCenter},
                {n: "dash", v: 80}
            ];
        }
    
        // Формируем действия
        const actions = [];
        if(Math.abs(angleToTarget) > 15) {
            actions.push({n: "turn", v: angleToTarget});
        }
        
        if(distanceToTarget > 2) {
            const dashPower = Math.min(
                100, 
                distanceToTarget * 2 + 30 - (isNearBoundary ? 50 : 0)
            );
            actions.push({n: "dash", v: dashPower});
        }
    
        return actions.length > 0 ? actions : {n: "turn", v: 0};
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
            (targetDist*0.6) + // Основная компонента расстояния
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
    // pass(taken) {
    //     const teammate = taken.last_seen_teammate;
    //     const prevPos = teammate.prevPos || teammate;
    //     const speed = {
    //         x: teammate.x - prevPos.x,
    //         y: teammate.y - prevPos.y
    //     };
    
    //     // Прогнозируем позицию через 0.5 сек
    //     const predictCoeff = 0.5;
    //     const target = {
    //         x: teammate.x + speed.x * predictCoeff,
    //         y: teammate.y + speed.y * predictCoeff
    //     };
    
    //     const currentBallDist = calculations.distance(taken.state.pos, taken.state.ball);
    //     const targetDist = calculations.distance(taken.state.pos, target);
        
    //     // Расчет силы удара с запасом 15%
    //     const kickPower = Math.min(
    //         100, 
    //         (targetDist * 1.15) + (currentBallDist * 0.8)
    //     );
    
    //     // Точность на основе расстояния
    //     const anglePrecision = Math.max(1 - targetDist/50, 0.2);
    //     const aimAngle = calculations.calculateAngle(taken.state.pos, target);
    //     const precisionAngle = aimAngle + (Math.random() - 0.5) * 5 * (1 - anglePrecision);
    
    //     return {
    //         n: "kick",
    //         v: `${Math.round(kickPower)} ${precisionAngle.toFixed(1)}`
    //     };
    // },

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
    },

    actionReturn(input){
		if (!input.state.goal) return {n: "turn", v: 60};
		if (Math.abs(input.state.goal.angle) > 10)
			return {n: "turn", v: input.state.goal.angle};
		if (input.state.goal.dist > 3)
			return {n: "dash", v: input.state.goal.dist * 2 + 30}
		input.action = "rotateCenter";
		return {n: "turn", v: 180};
	},
	rotateCenter(input){
		if (!input.state.all_flags["fc"]) return {n: "turn", v: 60};
		input.action = "seekBall";
		return {n: "turn", v: input.state.all_flags["fc"].angle};
	},

    seekBall(input){
		if (input.state.all_flags[input.turnData]){

			if (Math.abs(input.state.all_flags[input.turnData].angle) > 10)
				return {n: "turn", v: input.state.all_flags[input.turnData].angle};
			if (input.turnData == "ft0") input.turnData = "fb0";
			else
				if (input.turnData == "fb0"){
					input.turnData = "ft0";
					input.action = "rotateCenter";
					return this.rotateCenter(input);
				}
		}
		if (input.turnData == "ft0")
			return {n: "turn", v: (input.side == "l") ? -20 : 20};
		if (input.turnData == "fb0"){
			return {n: "turn", v: (input.side == "l") ? 20 : -20};
		}
		//throw "Error"
	}



}