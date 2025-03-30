class FuzzyController {
    constructor() {
        this.distanceMF = {
            near: (d) => Math.max(0, 1 - d / 10),
            medium: (d) => Math.max(0, 1 - Math.abs(d - 15) / 10),
            far: (d) => Math.max(0, (d - 10) / 20)
        };

        this.angleMF = {
            left: (a) => Math.max(0, (a + 45) / 90),
            front: (a) => Math.max(0, 1 - Math.abs(a) / 90),
            right: (a) => Math.max(0, (45 - a) / 90)
        };

        this.positionXMF = {
            left: (x) => x < -20 ? 1 : Math.max(0, 1 - (x + 20) / 10),
            center: (x) => Math.max(0, 1 - Math.abs(x) / 20),
            right: (x) => x > 20 ? 1 : Math.max(0, (x - 20) / 10)
        };
    }

    evaluateGoalie(state) {
        if (!state?.ball) return { n: 'turn', v: 45 };
        
        const ball = state.ball;
        const ballDist = ball.dist || 0;
        const ballAngle = ball.angle || 0;
        const ballX = ball.x || 0;

        const distValues = {
            near: this.distanceMF.near(ballDist),
            medium: this.distanceMF.medium(ballDist),
            far: this.distanceMF.far(ballDist)
        };
        
        const angleValues = {
            left: this.angleMF.left(ballAngle),
            front: this.angleMF.front(ballAngle),
            right: this.angleMF.right(ballAngle)
        };

        const rules = [
            { // Экстренный блок
                condition: () => distValues.near > 0.7 && angleValues.front > 0.7,
                action: () => ({ n: 'catch', v: Math.min(180, Math.max(-180, ballAngle)) })
            },
            { // Ближняя зона
                condition: () => distValues.near > 0.5,
                action: () => ({ n: 'dash', v: 100 })
            },
            // { // Средняя дистанция
            //     condition: () => distValues.medium > 0.5,
            //     action: () => {
            //         const targetX = Math.max(-50, Math.min(0, ballX * 0.7));
            //         return { n: 'move', v: `${targetX.toFixed(1)} 0` };
            //     }
            // },
            // { // Возврат на позицию
            //     condition: () => distValues.far > 0.5,
            //     action: () => ({ n: 'move', v: '-50.0 0' })
            // }
        ];

        for (const rule of rules) {
            try {
                if (rule.condition()) {
                    const action = rule.action();
                    if (action && action.n && action.v !== undefined) return action;
                }
            } catch (e) {
                console.error('Rule error:', e);
            }
        }
        
        return { n: 'turn', v: 45 };
    }


    _shootDecision(state) {
        const goal = state.rival_goal || { angle: 0 };
        return { 
            n: 'kick', 
            v: `100 ${Math.min(180, Math.max(-180, goal.angle))}` 
        };
    }

    _passDecision(state) {
        const teammates = (state.myTeam || [])
            .filter(p => p.dist < 15)
            .sort((a, b) => a.dist - b.dist);

        if (teammates.length > 0) {
            return { 
                n: 'kick', 
                v: `80 ${Math.min(180, Math.max(-180, teammates[0].angle))}` 
            };
        }
        
        return { n: 'kick', v: '50 45' };
    }

    calculateSafeDirection(state) {
        const angles = (state.enemyTeam || []).map(p => p.angle).filter(a => !isNaN(a));
        if (angles.length === 0) return 45;

        const freeSector = this._findLargestSector(angles);
        return (freeSector.start + freeSector.end) / 2;
    }

    _findLargestSector(angles, resolution = 30) {
        let maxSector = { start: -180, end: -180, size: 0 };
        
        for (let angle = -180; angle <= 180; angle += resolution) {
            const end = angle + resolution;
            const count = angles.filter(a => a >= angle && a < end).length;
            
            if (count === 0 && resolution > maxSector.size) {
                maxSector = { start: angle, end, size: resolution };
            }
        }
        
        return maxSector;
    }


    evaluatePlayer(state) {
        if (!state?.ball || !state?.pos) return { n: 'turn', v: 45 };

        const { ball, pos, myTeam = [], enemyTeam = [] } = state;
        const ballDist = ball.dist || 0;
        const ballAngle = ball.angle || 0;
        console.log("EVALUATE PLAYER", ball, pos)
        // Нечеткие оценки
        const dist = this._fuzzify(ballDist, this.distanceMF);
        const angle = this._fuzzify(ballAngle, this.angleMF);
        const positionRole = this._fuzzify(pos.x, this.positionXMF);

        // Анализ ситуации
        const isClosest = this._isClosestToBall(pos, myTeam, ball);
        const hasBetterPosition = this._hasBetterPosition(myTeam, ball);
        const pressureLevel = this._calculatePressure(enemyTeam);

        // Правила принятия решений
        const rules = [
            { // Непосредственная угроза
                condition: () => dist.very_near > 0.8 && pressureLevel > 0.7,
                action: () => this._emergencyKick(state)
            },
            { // Удар по воротам
                condition: () => dist.very_near > 0.6 && angle.front > 0.7,
                action: () => this._shootDecision(state)
            },
            { // Пасс ближайшему к воротам
                condition: () => dist.near > 0.5 && hasBetterPosition,
                action: () => this._strategicPass(state)
            },
            { // Ведение мяча
                condition: () => dist.near > 0.4 && isClosest && positionRole.offensive > 0.6,
                action: () => this._dribble(state)
            },
            { // Возврат в позицию
                condition: () => dist.far > 0.5 && positionRole.defensive > 0.5,
                action: () => this._positioningDecision(state)
            },
            { // Перехват мяча
                condition: () => isClosest && dist.medium > 0.4,
                action: () => this._interceptBall(state)
            }
        ];

        for (const rule of rules) {
            try {
                if (rule.condition()) {
                    const action = rule.action();
                    if (action?.n) return action;
                }
            } catch (e) {
                console.error('Rule error:', e);
            }
        }

        return { n: 'turn', v: ballAngle };
    }

    _fuzzify(value, mf) {
        return Object.keys(mf).reduce((res, key) => {
            res[key] = mf[key](value);
            return res;
        }, {});
    }

    _isClosestToBall(myPos, teammates, ball) {
        const myDist = Math.hypot(myPos.x - ball.x, myPos.y - ball.y);
        return teammates.every(p => 
            Math.hypot(p.x - ball.x, p.y - ball.y) > myDist
        );
    }

    _hasBetterPosition(teammates, ball) {
        return teammates.some(p => 
            p.x > ball.x + 5 && Math.abs(p.y - ball.y) < 10
        );
    }

    _calculatePressure(enemies) {
        const closeEnemies = enemies.filter(e => e.dist < 8).length;
        return Math.min(1, closeEnemies * 0.3);
    }

    _strategicPass(state) {
        const receiver = state.myTeam
            .filter(p => p.x > state.ball.x)
            .sort((a, b) => (b.x - a.x) || (a.dist - b.dist))[0];

        if (receiver) {
            const power = Math.min(100, 30 + receiver.dist * 3);
            return { n: 'kick', v: `${power} ${receiver.angle}` };
        }
        return this._shootDecision(state);
    }

    _dribble(state) {
        const targetX = state.side === 'l' ? 
            Math.min(45, state.ball.x + 8) : 
            Math.max(-45, state.ball.x - 8);
            
        const angle = Math.atan2(targetX - state.pos.x, 0) * 180/Math.PI;
        return Math.abs(angle) > 15 ? 
            { n: 'turn', v: angle } : 
            { n: 'dash', v: 80 };
    }

    _interceptBall(state) {
        const ball = state.ball;
        const interceptPoint = this._predictPosition(ball);
        const angle = Math.atan2(
            interceptPoint.y - state.pos.y,
            interceptPoint.x - state.pos.x
        ) * 180/Math.PI;

        return {
            n: Math.abs(angle) > 20 ? 'turn' : 'dash',
            v: Math.abs(angle) > 20 ? angle : 100
        };
    }

    _predictPosition(ball) {
        const speed = ball.distChange || 0;
        return {
            x: ball.x + speed * Math.cos(ball.angle * Math.PI/180),
            y: ball.y + speed * Math.sin(ball.angle * Math.PI/180)
        };
    }

    _positioningDecision(state) {
        // Рассчитываем целевую позицию
        const targetX = state.ball.x * 0.6 + (state.side === 'l' ? 10 : -10);
        const targetY = state.pos.y * 0.8;
    
        // Рассчитываем направление к цели
        const dx = targetX - state.pos.x;
        const dy = targetY - state.pos.y;
        const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const angleDiff = targetAngle - (state.direction || 0);
    
        // Правила для движения
        if (Math.abs(angleDiff) > 20) {
            // Поворот к цели
            return { 
                n: 'turn', 
                v: angleDiff
            };
        } else {
            // Бег с регулировкой скорости
            const distance = Math.sqrt(dx*dx + dy*dy);
            const dashPower = Math.min(100, distance * 2 + 30);
            
            return { 
                n: 'dash', 
                v: dashPower,
                d: targetAngle // Направление бега (опционально)
            };
        }
    }

    _emergencyKick(state) {
        const safeAngle = this.calculateSafeDirection(state);
        return {
            n: 'kick',
            v: `80 ${safeAngle}`
        };
    }
}

module.exports = FuzzyController;