const utils = require("./utils");

class FuzzyGoalie {
    constructor() {
        this.immediateCatch = this.immediateCatch.bind(this);
        this.emergencyKick = this.emergencyKick.bind(this);
        this.positioning = this.positioning.bind(this);
        this.activeDefense = this.activeDefense.bind(this)
        this.rules = [
            // Правило 1: Непосредственный перехват (0-3m)
            {
                conditions: {
                    distance: x => this.triangular(x, 0, 3, 5),
                    threat: x => x ? 1 : 0.2
                },
                action: this.immediateCatch,
                weight: 2.0
            },
            // Правило 2: Экстренный удар (2-10m + угроза)
            {
                conditions: {
                    distance: x => this.triangular(x, 2, 5, 10),
                    threat: x => x ? 1 : 0
                },
                action: this.emergencyKick,
                weight: 1.5
            },
            // Правило 3: Активная защита (5-25m)
            {
                conditions: {
                    distance: x => this.triangular(x, 5, 15, 25)
                },
                action: this.activeDefense
            },
            // Правило 4: Базовое позиционирование
            {
                conditions: {
                    distance: x => this.triangular(x, 20, 40, 60)
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
        console.log("EVALUATE inputs", inputs);

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
        return {
            distance: state.ball.dist || Infinity,
            angle: Math.abs(state.ball.angle || 0),
            threat: this.calculateThreatLevel(state)
        };
    }

    // Новая треугольная функция принадлежности
    triangular(x, a, b, c) {
        if (x <= a) return 0;
        if (x > a && x <= b) return (x - a)/(b - a);
        if (x > b && x <= c) return (c - x)/(c - b);
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
        const targetPos = this.calculateInterceptPosition(state);
        const angle = Math.atan2(targetPos.y - state.pos?.y, 
                               targetPos.x - state.pos?.x) * 180/Math.PI;
        
        return Math.abs(angle) > 15 
            ? {n: "turn", v: angle}
            : {n: "dash", v: 80};
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
            console.log("CALCULATEACT",inputs[param])
            const value = inputs[param] || 0;
            return fn(value);
        });
        return Math.min(...activations) * (rule.weight || 1);
    }

    // Реализация действий
    immediateCatch(state) {
        if (state.ball.dist < 0.5) {
            console.log("IMMIDIATE catch", state.ball.angle)
            return {n: "catch", v: state.ball.angle};
        }
        console.log("IMMIDIATE dash", state.ball.dist)
        return {n: "dash", v: 100};
    }

    emergencyKick(state) {
        const kickAngle = this.calculateSafeDirection(state);
        console.log("EMERGENCY", kickAngle)
        return {n: "kick", v: `100 ${kickAngle}`};
    }

    passToTeammate(state) {
        const teammate = this.findClosestTeammate(state);
        return teammate 
            ? {n: "kick", v: `80 ${teammate.angle}`}
            : this.emergencyKick(state);
    }

    positioning(state) {
        if (!state.pos) return {n: "move", v: "-50 0"};
        
        const targetPos = this.calculateOptimalPosition(state);
        const angle = Math.atan2(targetPos.y - state.pos.y, 
                               targetPos.x - state.pos.x) * 180/Math.PI;
        console.log("POSITIONING", angle)
        return Math.abs(angle) > 10 
            ? {n: "turn", v: angle}
            : {n: "dash", v: 60};
    }

    // Вспомогательные методы
    calculateSafeDirection(state) {
        // Выбираем направление в противоположную от ворот сторону
        return state.rival_goal 
            ? (state.rival_goal.angle + 180) % 360
            : state.ball.angle + 180;
    }

    findClosestTeammate(state) {
        return state.myTeam.reduce((closest, current) => 
            current.dist < (closest.dist || Infinity) ? current : closest, 
            null
        );
    }

    nearOpponents(state) {
        return state.enemyTeam.some(p => 
            p.dist < 3 && Math.abs(p.angle) < 30
        );
    }

    searchBall(state) {
        return {n: "turn", v: 60};
    }

    defaultBehavior(state) {
        return state.ball.dist < 20 
            ? {n: "turn", v: state.ball.angle}
            : {n: "move", v: "-50 0"};
    }

    calculateOptimalPosition(state) {
        const baseX = -50;
        const ballX = state.ball.x || baseX;
        return {
            x: baseX + Math.max(0, (ballX - baseX)) * 0.2,
            y: (state.ball.y || 0) * 0.3
        };
    }
}

module.exports = FuzzyGoalie;