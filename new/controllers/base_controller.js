// controllers/baseController.js
class BaseController {
    constructor(agent) {
        this.agent = agent;
        this.worldModel = {
            ball: null,
            teammates: [],
            opponents: [],
            flags: [],
            playMode: 'before_kick_off'
        };
    }

    updateWorldModel(objects) {
        this.worldModel.ball = objects.find(o => o.type === 'ball') || this.worldModel.ball;
        this.worldModel.teammates = objects.filter(o => o.type === 'player' && o.team === this.agent.team);
        this.worldModel.opponents = objects.filter(o => o.type === 'player' && o.team !== this.agent.team);
        this.worldModel.flags = objects.filter(o => o.type === 'flag');
    }

    processHear(data) {
        const [time, source, message] = data;
        if (source === 'referee') {
            this.worldModel.playMode = message;
        }
    }

    processSenseBody(data) {
        this.bodyState = data;
    }

    decideAction() {
        // Базовые правила для всех игроков
        if (this.isBallClose()) {
            return this.handleBallPossession();
        }
        return this.positioning();
    }

    // Нечеткие функции принадлежности
    fuzzyDistance(d) {
        return {
            veryNear: Math.max(0, 1 - d/3),
            near: Math.max(0, 1 - Math.abs(d-5)/3),
            far: Math.max(0, (d-7)/10)
        };
    }

    fuzzyAngle(a) {
        return {
            front: Math.max(0, 1 - Math.abs(a)/30),
            left: Math.max(0, a/45),
            right: Math.max(0, -a/45)
        };
    }

    // Базовые методы для наследования
    isBallClose() {
        return this.worldModel.ball?.distance < 5;
    }

    handleBallPossession() {
        // Заглушка для реализации в наследниках
    }

    positioning() {
        // Заглушка для реализации в наследниках
    }
}

module.exports = BaseController