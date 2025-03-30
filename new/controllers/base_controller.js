class BaseController {
    constructor(agent) {
        this.agent = agent;
        this.worldModel = { // Инициализация по умолчанию
            ball: null,
            flags: [],
            players: [],
            playMode: 'before_kick_off'
        };
        this.lastSeenBall = { cycle: 0, pos: null };
    }

    updateWorldModel(objects) {
        this.worldModel = {
            ball: objects.find(o => o?.type === 'ball'),
            flags: objects.filter(o => o?.type === 'flag'),
            players: objects.filter(o => o?.type === 'player'),
            playMode: this.agent.state.playMode
        };

        if (this.worldModel.ball) {
            this.lastSeenBall = {
                cycle: Date.now(),
                pos: this.calculateAbsolutePosition(this.worldModel.ball)
            };
        }
    }

    // Нечеткие функции принадлежности
    fuzzyDistance(d) {
        return {
            veryClose: Math.max(0, 1 - d / 3),
            close: Math.max(0, (5 - d) / 5),
            medium: Math.exp(-Math.pow((d - 10) / 5, 2)),
            far: Math.tanh(d / 20)
        };
    }

    fuzzyAngle(a) {
        const absA = Math.abs(a);
        return {
            front: Math.max(0, 1 - absA / 30),
            slight: Math.exp(-Math.pow((absA - 15) / 10, 2)),
            side: Math.exp(-Math.pow((absA - 45) / 20, 2)),
            back: Math.max(0, (absA - 90) / 90)
        };
    }

    // Решение на основе дефаззификации
    defuzzify(actions) {
        let bestAction = { type: 'turn', power: 0, angle: 0, score: -Infinity };

        for (const action of actions) {
            if (action.score > bestAction.score) {
                bestAction = action;
            }
        }
        return bestAction;
    }

    calculateAbsolutePosition(obj) {
        // Находим два ближайших флага
        const flags = this.worldModel.flags
            .map(f => ({
                ...f,
                distance: f.distance,
                direction: f.direction
            }))
            .sort((a, b) => a.distance - b.distance);

        if (flags.length >= 2) {
            const flag1 = flags[0];
            const flag2 = flags[1];
            return this.triangulatePosition(flag1, flag2);
        }

        // Если флагов недостаточно, используем последнюю известную позицию
        return this.lastSeenBall.pos || { x: 0, y: 0 };
    }

    triangulatePosition(flag1, flag2) {
        // Используем координаты известных флагов
        const Flags = require('../flags');
        const f1Pos = Flags[flag1.name];
        const f2Pos = Flags[flag2.name];

        if (!f1Pos || !f2Pos) return { x: 0, y: 0 };

        // Преобразуем полярные координаты в декартовы относительно агента
        const toCartesian = (distance, angle) => ({
            x: distance * Math.cos(angle * Math.PI / 180),
            y: distance * Math.sin(angle * Math.PI / 180)
        });

        const f1Rel = toCartesian(flag1.distance, flag1.direction);
        const f2Rel = toCartesian(flag2.distance, flag2.direction);

        // Вычисляем абсолютные координаты агента
        const agentX = (f1Pos.x - f1Rel.x + f2Pos.x - f2Rel.x) / 2;
        const agentY = (f1Pos.y - f1Rel.y + f2Pos.y - f2Rel.y) / 2;

        // Вычисляем абсолютные координаты объекта
        const objRel = toCartesian(obj.distance, obj.direction);
        return {
            x: agentX + objRel.x,
            y: agentY + objRel.y
        };
    }

    handleRefereeCommand(command) {
        // Обновляем режим игры в модели мира
        this.worldModel.playMode = command;

        // Дополнительная логика при необходимости
        switch (command) {
            case 'goal_l':
            case 'goal_r':
                this.lastSeenBall = { cycle: 0, pos: null };
                break;
        }
    }
}

module.exports = BaseController