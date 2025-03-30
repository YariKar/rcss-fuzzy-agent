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

    evaluatePlayer(state) {
        console.log("EVALUATE PLAYER ",state)
        if (!state?.ball || !state?.pos) return { n: 'turn', v: 45 };

        const ball = state.ball;
        const ballDist = ball.dist || 0;
        const ballAngle = ball.angle || 0;
        const pos = state.pos;

        const hasOpponentNear = (state.enemyTeam || []).some(p => p.dist < 5);
        const hasTeammateNear = (state.myTeam || []).some(p => p.dist < 7);

        const rules = [
            { // Удар по воротам
                condition: () => ballDist < 1 && !hasOpponentNear,
                action: () => this._shootDecision(state)
            },
            { // Пасс
                condition: () => ballDist < 3 && hasOpponentNear,
                action: () => this._passDecision(state)
            },
            { // Позиционирование
                condition: () => ballDist > 10,
                action: () => this._positioningDecision(state)
            },
            { // Движение к мячу
                condition: () => ballDist > 5,
                action: () => ({ n: 'dash', v: 100 })
            }
        ];
        console.log("EVALUATE PLAYER rules", rules)
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

        return { n: 'turn', v: ballAngle };
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

    _positioningDecision(state) { //TODO
        const ball = state.ball || { x: 0, y: 0 };
        const side = state.side === 'r' ? -1 : 1;
        const fieldLimit = 45;

        const targetX = Math.min(fieldLimit, Math.max(-fieldLimit, 
            ball.x + 10 * side));
        const targetY = Math.min(30, Math.max(-30, ball.y * 0.8));

        return { 
            n: 'turn', 
            v: `30` 
        };
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
}

module.exports = FuzzyController;