class FuzzyController {
    constructor() {
        this.distanceMF = {
            very_near: d => Math.max(0, 1 - d/5),
            near: d => Math.max(0, 1 - Math.abs(d-7.5)/5),
            medium: d => Math.max(0, 1 - Math.abs(d-15)/10),
            far: d => Math.max(0, d/30)
        };

        this.angleMF = {
            perfect: a => Math.max(0, 1 - Math.abs(a)/15),
            good: a => Math.max(0, 1 - Math.abs(a)/30),
            acceptable: a => Math.max(0, 1 - Math.abs(a)/45)
        };
        this.attackFlags = {
            l: ['fgrb', 'fgr', 'fgrt'],
            r: ['fglb', 'fgl', 'fglt']
        };
    }

    evaluateGoalie(state) {
        if (!state?.ball) return { n: 'turn', v: 45 };
        
        const ball = state.ball;
        const ballDist = ball.dist || 0;
        const ballAngle = ball.angle || 0;

        const rules = [
            {
                condition: () => ballDist < 3 && Math.abs(ballAngle) < 30,
                action: () => ({ n: 'kick', v: `100 ${ballAngle}` })
            },
            {
                condition: () => ballDist < 10,
                action: () => ({ n: 'dash', v: 100 })
            },
            {
                condition: () => true,
                action: () => ({ n: 'turn', v: 0 })
            }
        ];

        for (const rule of rules) {
            if (rule.condition()) return rule.action();
        }
    }

    evaluatePlayer(taken) {
        const state = taken.state
        if (!state?.ball || !state?.pos) return { n: 'turn', v: 45 };

        const { ball, pos, myTeam = [] } = state;
        const ballDist = ball.dist || 0;
        const ballAngle = ball.angle || 0;

        // Проверка является ли игрок ближайшим к мячу
        const isClosest = this._isClosestToBall(state);
        
        // Основные правила
        const rules = [
            {
                condition: () => isClosest && ballDist < 1,
                action: () => this._shootOrPass(taken)
            },
            {
                condition: () => isClosest && ballDist < 5,
                action: () => this._moveToBall(ballAngle, ballDist)
            },
            {
                condition: () => isClosest,
                action: () => this._positioningDecision(state)
            },
            {
                condition: () => true,
                action: () => this._strategicPositioning(state)
            }
        ];

        for (const rule of rules) {
            if (rule.condition()) {
                const action = rule.action();
                if (action) return action;
            }
        }

        return { n: 'turn', v: 0 };
    }

    _isClosestToBall(state) {
        if (!state.myTeam?.length) return true;
        const myDist = state.ball.dist;
        return state.myTeam.every(teammate => 
            teammate.dist === undefined || teammate.dist >= myDist
        );
    }

    _moveToBall(angle, distance) {
        if (Math.abs(angle) > 15) {
            return { n: 'turn', v: angle };
        }
        return { n: 'dash', v: Math.min(100, 30 + distance * 5) };
    }

    _shootOrPass(taken) {
        const state = taken.state
        console.log("SHOOTORPASS", state.rival_goal, state.pos);
    
        // Защита от отсутствия данных о воротах
        const goal = this._getGoalPosition(state);
        const goalDist = Math.hypot(state.pos.x - goal.x, state.pos.y - goal.y);
        
        // Условия удара
        if (goalDist < 30) {
            return this._tryPassOrShoot(state, goal);
        }
        return this._dribble(taken);
    }
    
    // Вспомогательные методы
    _getGoalPosition(state) {
        return {
            x: state.side === 'l' ? 52.5 : -52.5,
            y: 0,
            angle: state.side === 'l' ? 0 : 180
        };
    }
    
    _tryPassOrShoot(state, goal) {
        const teammates = state.myTeam?.filter(p => p.dist < 10) || [];
        
        if (teammates.length > 0) {
            const bestReceiver = teammates.sort((a, b) => a.dist - b.dist)[0];
            return { 
                n: 'kick', 
                v: `80 ${bestReceiver.angle || goal.angle}` 
            };
        }
        return { 
            n: 'kick', 
            v: `100 ${goal.angle}` 
        };
    }
    _dribble(taken) {
        const state = taken.state
        // 1. Определение направления атаки
        const attackAngle = this._getAttackDirection(taken);
        
        // 2. Расчет угла к мячу
        const ballRelAngle = state.ball.angle;
        const posDiff = attackAngle - ballRelAngle;

        // 3. Типы ведения
        return this._smartDribble(state, attackAngle, posDiff);
    }

    _getAttackDirection(taken) {
        const state = taken.state
        // Поиск флагов ворот
        console.log("ATTACK dir",taken.side)
        const flags = this.attackFlags[taken.side];
        for (const flag of flags) {
            if (state.all_flags?.[flag]) {
                return state.all_flags[flag].angle;
            }
        }
        return state.side === 'l' ? 0 : 180;
    }

    _smartDribble(state, attackAngle, posDiff) {
        const rules = [
            {
                condition: () => Math.abs(posDiff) > 90,
                action: () => this._turnDribble(state, attackAngle)
            },
            {
                condition: () => Math.abs(posDiff) > 30,
                action: () => this._curveDribble(state, attackAngle)
            },
            {
                condition: () => true,
                action: () => this._forwardDribble(state)
            }
        ];

        for (const rule of rules) {
            if (rule.condition()) return rule.action();
        }
    }

    _turnDribble(state, targetAngle) {
        return {
            n: 'kick',
            v: `40 ${targetAngle + 45 * Math.sign(targetAngle)}`,
            _comment: "Сильный удар с разворотом"
        };
    }

    _curveDribble(state, targetAngle) {
        return {
            n: 'kick',
            v: `30 ${targetAngle + 15 * Math.sign(targetAngle)}`,
            _comment: "Плавный доворот с мячом"
        };
    }

    _forwardDribble(state) {
        const power = state.ball.dist < 2 ? 40 : 20;
        return {
            n: 'kick',
            v: `${power} 0`,
            _comment: "Прямое ведение"
        };
    }

    _positioningDecision(state) {
        const ball = state.ball;
        const dx = ball.x - state.pos.x;
        const dy = ball.y - state.pos.y;
        const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        if (Math.abs(targetAngle) > 20) {
            return { n: 'turn', v: targetAngle };
        }
        return { n: 'dash', v: 80 };
    }

    _strategicPositioning(state) {
        const strategicX = state.side === 'l' ? 
            Math.min(40, state.pos.x + 10) : 
            Math.max(-40, state.pos.x - 10);
            
        const dx = strategicX - state.pos.x;
        const angle = Math.atan2(0, dx) * 180 / Math.PI;
        
        return Math.abs(angle) > 15 ? 
            { n: 'turn', v: angle } : 
            { n: 'dash', v: 60 };
    }

    calculateOptimalPosition(state) {
        const penaltyArea = {
            left: state.side === 'l' ? -52.5 : 40,
            right: state.side === 'l' ? -40 : 52.5,
            yLimit: 20
        };

        const goalCenter = {
            x: state.side === 'l' ? -52.5 : 52.5,
            y: 0
        };

        const ballPos = state.ball || { x: 0, y: 0 };
        let targetY = 0;

        // Ограничение движения вратаря своей штрафной
        if (ballPos.x >= penaltyArea.left && ballPos.x <= penaltyArea.right) {
            targetY = ballPos.y * 0.8;
        } else {
            targetY = state.pos.y; // Не покидать текущую позицию Y
        }

        targetY = Math.max(-penaltyArea.yLimit, Math.min(penaltyArea.yLimit, targetY));

        return {
            x: goalCenter.x + (state.side === 'l' ? 2.5 : -2.5),
            y: targetY
        };
    }

    calculateSafeDirection(state) {
        // 1. Проверка наличия противников
        const enemies = state.enemyTeam || [];
        if (enemies.length === 0) {
            return state.rival_goal?.angle || 45; // Направление на ворота если противников нет
        }
    
        // 2. Сбор углов противников с фильтрацией NaN
        const enemyAngles = enemies
            .map(e => e.angle)
            .filter(a => typeof a === 'number' && !isNaN(a));
    
        // 3. Поиск безопасного сектора
        const sectorSize = 30; // Ширина сектора в градусах
        let bestSector = { start: -180, count: Infinity };
        
        // Сканируем все возможные сектора
        for (let start = -180; start <= 180; start += sectorSize/2) {
            const end = start + sectorSize;
            const count = enemyAngles.filter(a => 
                this._isAngleInSector(a, start, end)
            ).length;
            
            if (count < bestSector.count) {
                bestSector = { start, end, count };
            }
        }
    
        // 4. Расчет оптимального направления
        const safeAngle = (bestSector.start + bestSector.end)/2;
        
        // 5. Корректировка направления если мяч близко
        if (state.ball?.dist < 3) {
            return this._adjustAngleForBall(safeAngle, state);
        }
    
        return safeAngle;
    }
    
    // Вспомогательные методы
    _isAngleInSector(angle, start, end) {
        angle = ((angle % 360) + 360) % 360; // Нормализация 0-360
        start = ((start % 360) + 360) % 360;
        end = ((end % 360) + 360) % 360;
        
        return (start <= end) 
            ? (angle >= start && angle <= end)
            : (angle >= start || angle <= end);
    }
    
    _adjustAngleForBall(baseAngle, state) {
        // Учет текущей ориентации игрока
        const currentDir = state.direction || 0;
        const angleDiff = Math.abs(baseAngle - currentDir);
        
        // Плавная коррекция если разница больше 45°
        return angleDiff > 45 
            ? currentDir + (baseAngle - currentDir)*0.7
            : baseAngle;
    }

}

module.exports = FuzzyController;