class FuzzyController {
    constructor(agent) {
        this.agent = agent;
        this.rules = [
            {
                name: "critical_zone",
                inputs: {
                    distance: { mf: 'near', params: [0, 5] },
                    speed: { mf: 'fast', params: [1.0, 3.0] },
                    angle: { mf: 'direct', params: [-30, 30] }
                },
                output: { action: 'catch', priority: 1 }
            },
            {
                name: "intercept_zone",
                inputs: {
                    distance: { mf: 'medium', params: [5, 20] },
                    speed: { mf: 'moving', params: [0.3, 1.5] },
                    angle: { mf: 'wide', params: [-45, 45] }
                },
                output: { action: 'intercept', priority: 2 }
            },
            {
                name: "track_zone",
                inputs: {
                    distance: { mf: 'far', params: [15, 60] }, // >=15 метров
                    speed: { mf: 'any', params: [] },
                    angle: { mf: 'visible', params: [-90, 90] }
                },
                output: { action: 'track', priority: 3 }
            }
        ];
    }

    // Функции принадлежности
    mf(x, type, params) {
        switch(type) {
            case 'near':
                return Math.max(0, 1 - x/params[1]);
            case 'far':
                return x >= params[0] ? 1 : 0; // True, если расстояние >=15
            case 'fast':
                return x < params[0] ? 0 : Math.min(1, (x - params[0])/(params[1] - params[0]));
            case 'direct':
                return 1 - Math.min(1, Math.abs(x)/params[1]);
            case 'visible':
                return Math.abs(x) <= params[1] ? 1 : 0; // True, если угол в пределах [-90,90]
            case 'any':
                return 1;
            default:
                return 0;
        }
    }

    evaluate(ball) {
        const inputs = {
            distance: ball.dist,
            speed: this.calculateBallSpeed(),
            angle: Math.abs(ball.angle)
        };
        console.log("EVALUATE", inputs)
        return this.processRules(inputs);
    }

    defuzzify(activations) {
        // Реализация дефаззификации (например, взвешенное среднее)
        let total = 0;
        let sum = 0;
        
        activations.forEach(a => {
            const weight = a.strength;
            total += weight * this.threatValue(a.threat);
            sum += weight;
        });
        
        return sum > 0 ? total/sum : 0;
    }

    threatValue(level) {
        const values = {
            critical: 0.9,
            high: 0.7,
            medium: 0.5,
            low: 0.3
        };
        return values[level] || 0;
    }

    evaluateEnvironment() {
        //console.log("FUZZY evaluateenv", this.agent.taken.state)
        const state = this.agent.taken.state
        if (!state || !state['ball']) return null;
        
        const inputs = {
            distance: state['ball'].dist,
            speed: this.calculateBallSpeed(),
            angle: state['ball'].angle
        };
        
        return this.processRules(inputs);
    }

    calculateBallSpeed() {
        const current = this.agent.taken.state.ball;
        const prev = this.agent.taken.state.ballPrev;
        
        // Если нет предыдущего состояния или текущего мяча
        if (!prev || !current) return 0;
        
        // Получаем разницу во времени из общего времени агента
        const currentTime = this.agent.taken.state.time;
        const prevTime = this.agent.taken.state.ballPrev.time || currentTime - 1;
        const dt = currentTime - prevTime;
        
        // Рассчитываем изменение координат
        const dx = current.x - prev.x;
        const dy = current.y - prev.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // Защита от нулевого/отрицательного времени и аномальных значений
        return dt > 0 ? distance / dt : 0;
    }
    processRules(inputs) {
        let maxPriority = -Infinity;
        let bestAction = null;
        
        this.rules.forEach(rule => {
            const activation = this.calculateActivation(rule.inputs, inputs);
            console.log(`RULE ${rule.name}: activation=${activation.toFixed(2)}`);
            if (activation > 0 && rule.output.priority > maxPriority) {
                maxPriority = rule.output.priority;
                bestAction = this.generateAction(rule.output.action, inputs);
            }
        });
        
        return bestAction;
    }

    calculateActivation(ruleInputs, currentInputs) {
        let activation = 1;
        
        Object.entries(ruleInputs).forEach(([param, desc]) => {
            const value = currentInputs[param];
            activation = Math.min(activation, this.membership(value, desc));
        });
        
        return activation;
    }

    membership(value, descriptor) {
        const [mf, params] = [descriptor.mf, descriptor.params];
        switch(mf) {
            case 'near':
                return Math.max(0, 1 - value/params[1]);
            case 'far':
                return Math.min(1, value/params[1]);
            case 'fast':
                return value < params[0] ? 0 : Math.min(1, (value - params[0])/(params[1] - params[0]));
            case 'direct':
                return 1 - Math.min(1, Math.abs(value)/params[1]);
            case 'any':
                return 1;
            default:
                return 0;
        }
    }

    generateAction(type, inputs) {
        switch(type) {
            case 'emergency_catch':
                return {
                    immediate: true,
                    command: { n: "catch", v: inputs.angle }
                };
            case 'intercept':
                const dashPower = Math.min(100, 80 + inputs.distance*5);
                return {
                    immediate: true,
                    command: { n: "dash", v: dashPower }
                };
            case 'positioning':
                return null; // Делегируем обычным контроллерам
        }
    }
}

module.exports = FuzzyController;