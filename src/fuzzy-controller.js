const utils = require("./utils");

class FuzzyGoalie {
    constructor(side='l') {
        this.side = side; // 'l' или 'r'
        this.PENALTY_AREA_X = this.side === 'l' ? -36 : 36;
        this.BASE_X = this.side === 'l' ? -50 : 50;
        this.searchAngle = 0;
        this.returnToBase = this.returnToBase.bind(this)
        this.immediateCatch = this.immediateCatch.bind(this);
        this.emergencyKick = this.emergencyKick.bind(this);
        this.positioning = this.positioning.bind(this);
        this.activeDefense = this.activeDefense.bind(this)
        this.rules = [
              // Правило 1: Мгновенный перехват (0-5m)
              {
                conditions: {
                    distance: x => this.triangular(x, 0, 2.5, 5),
                    threat: x => x > 0.3 ? 1 : 0
                },
                action: this.immediateCatch,
                weight: 20.0
            },
            // Правило 2: Экстренный удар
            {
                conditions: {
                    distance: x => x < 8 ? 1 : 0,
                    opponents: x => x ? 1 : 0,
                    outsidePenalty: x => x ? 0 : 1
                },
                action: this.emergencyKick,
                weight: 15.0
            },
            // Правило 3: Пас союзнику
            {
                conditions: {
                    distance: x => x < 15 ? 1 : 0,
                    threat: x => x < 0.2 ? 1 : 0,
                    hasTeammate: x => x ? 1 : 0
                },
                action: this.passToTeammate,
                weight: 5.0
            },
            // Правило 4: Активная защита
            {
                conditions: {
                    distance: x => this.triangular(x, 5, 15, 25),
                    outsidePenalty: x => x ? 0 : 1
                },
                action: this.activeDefense
            },
            // Правило 5: Базовое позиционирование
            {
                conditions: {
                    distance: x => this.triangular(x, 20, 40, 60),
                    outsidePenalty: x => x ? 0 : 1
                },
                action: this.positioning
            }
        ];
    }

    evaluate(state) {
        if (!state || !state.ball) {
            return this.searchBall(state);
        }

        const inputs = this.prepareInputs(state);
        console.log("EVALUATE inputs", inputs, this.side);

        let maxActivation = 0;
        let bestAction = null;

        for (const rule of this.rules) {
            const activation = this.calculateActivation(rule, inputs);
            console.log(`Rule ${rule.action.name} activation: ${activation}`);

            if (activation > maxActivation) {
                maxActivation = activation;
                bestAction = rule.action;
            }
        }

        return bestAction ? bestAction(state) : this.defaultBehavior(state);
    }

    prepareInputs(state) {
        const baseInputs = {
            distance: state.ball?.dist || Infinity,
            angle: Math.abs(state.ball?.angle || 0),
            threat: this.calculateThreatLevel(state)
        };

        return {
            ...baseInputs, // Распаковываем базовые параметры
            outsidePenalty: this.isOutsidePenaltyArea(state) ? 1 : 0,
            distanceToBase: this.calculateDistanceToBase(state)
        };
    }


    isOutsidePenaltyArea(state) {
        return state.pos?.x > this.PENALTY_AREA_X;
    }

    calculateDistanceToBase(state) {
        return Math.sqrt(
            Math.pow(state.pos?.x - this.BASE_X, 2) +
            Math.pow(state.pos?.y, 2)
        );
    }

    returnToBase(state) {
        if (this.calculateDistanceToBase(state) < 2) {
            return { n: "turn", v: 0 };
        }
        return { n: "move", v: `${this.BASE_X} 0` };
    }


    // Новая треугольная функция принадлежности
    triangular(x, a, b, c) {
        if (x <= a) return 0;
        if (x > a && x <= b) return (x - a) / (b - a);
        if (x > b && x <= c) return (c - x) / (c - b);
        return 0;
    }

    calculateThreatLevel(state) {
        return this.nearOpponents(state) ? 1 : 0;
    }

    nearOpponents(state) {
        return state.enemyTeam.some(p =>
            p.dist < 5 && Math.abs(p.angle) < 45
        );
    }

    activeDefense(state) {
        if (this.isOutsidePenaltyArea(state)) {
            return this.returnToBase(state);
        }
        const targetPos = this.calculateInterceptPosition(state);
        const angle = Math.atan2(targetPos.y - state.pos?.y,
            targetPos.x - state.pos?.x) * 180 / Math.PI;

        return Math.abs(angle) > 15
            ? { n: "turn", v: angle }
            : { n: "dash", v: 80 };
    }

    calculateInterceptPosition(state) {
        // Логика предсказания движения мяча
        return {
            x: state.ball.x + (state.ball.x - state.ballPrev?.x || 0),
            y: state.ball.y + (state.ball.y - state.ballPrev?.y || 0)
        };
    }

    calculateActivation(rule, inputs) {
        const activations = Object.entries(rule.conditions).map(([param, fn]) => {
            console.log("CALCULATEACT", inputs[param])
            const value = inputs[param] || 0;
            return fn(value);
        });
        return Math.min(...activations) * (rule.weight || 1);
    }

    immediateCatch(state) {
        if (state.ball?.dist < 5.0) { // Увеличен радиус действия
            console.log("INNEDIATE catch", state.ball.angle);
            return {n: "catch", v: state.ball.angle};
        }
        console.log("INNEDIATE dash", state.ball?.dist);
        return {n: "dash", v: 100};
    }
    emergencyKick(state) {
        const kickAngle = state.rival_goal ? 
            (state.rival_goal.angle + 180) % 360 : 
            180;
        console.log("EMERGENCY KICK TO", kickAngle, this.side);
        return {n: "kick", v: `100 ${kickAngle}`};
    }

    passToTeammate(state) {
        const teammate = this.findClosestTeammate(state);
        return teammate
            ? { n: "kick", v: `80 ${teammate.angle}` }
            : this.emergencyKick(state);
    }
    positioning(state) {
        if (!state?.pos) return { n: "move", v: `${this.BASE_X} 0` };
        
        const targetPos = {
            x: this.BASE_X + (state.ball.x - this.BASE_X) * 0.25,
            y: state.ball.y * 0.35
        };
        targetPos.x = Math.min(this.PENALTY_AREA_X, targetPos.x);
        
        const angle = Math.atan2(targetPos.y - state.pos.y, 
                               targetPos.x - state.pos.x) * 180/Math.PI;
        
        return Math.abs(angle) > 10 
            ? { n: "turn", v: angle }
            : { n: "dash", v: 60 };
    }

    hasCloseTeammate(state) {
        return state.myTeam?.some(p => 
            p.dist < 10 && Math.abs(p.angle) < 45
        ) ?? false;
    }

    // Вспомогательные методы
    calculateSafeDirection(state) {
        const goalAngle = this.side === 'l' ? 
            (state.rival_goal?.angle || 0) + 180 : 
            (state.rival_goal?.angle || 180);
        return goalAngle % 360;
    }

    findClosestTeammate(state) {
        return state.myTeam.reduce((closest, current) =>
            current.dist < (closest.dist || Infinity) ? current : closest,
            null
        );
    }

    nearOpponents(state) {
        // Улучшенное определение угрозы
        return state.enemyTeam?.some(p => 
            p.dist < 8 && Math.abs(p.angle) < 60
        ) ?? false;
    }

    searchBall(state) {
        this.searchAngle = (this.searchAngle + 30) % 360;
        return { n: "turn", v: this.searchAngle, d: 50 };
    }

    defaultBehavior(state) {
        return state.ball.dist < 20
            ? { n: "turn", v: state.ball.angle }
            : { n: "move", v: "-50 0" };
    }

    calculateOptimalPosition(state) {
        const baseX = this.BASE_X;
        let ballX = state.ball.x || baseX;

        // Ограничение движения за линию пенальти
        const targetX = Math.min(
            this.PENALTY_AREA_X,
            baseX + Math.max(0, (ballX - baseX) * 0.2)
        );

        return {
            x: targetX,
            y: (state.ball.y || 0) * 0.3
        };
    }
}

module.exports = FuzzyGoalie;