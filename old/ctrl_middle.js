const CTRL_MIDDLE_GOALIE = {
    lastPosition: null,
    
    execute(taken, controllers, fuzzy) {
        // Сохраняем последнюю известную позицию
        if (taken.state.pos) this.lastPosition = taken.state.pos;

        if (!taken.state.ball) {
            return this._searchBall(taken);
        }

        // Рассчитываем целевую позицию
        const targetPos = fuzzy.calculateOptimalPosition(taken.state);
        
        // Проверяем необходимость возврата в штрафную
        if (!this._inPenaltyArea(taken)) {
            return this._returnToPenaltyArea(taken, targetPos);
        }

        // Стандартное поведение в штрафной
        return controllers[2].execute(taken, fuzzy);
    },

    _searchBall(taken) {
        const searchAngle = (this.lastPosition?.x < -40) ? 45 : -45;
        return { 
            n: 'turn', 
            v: searchAngle,
            __comment: "Поиск мяча в пределах штрафной" 
        };
    },

    _inPenaltyArea(taken) {
        return taken.side === 'l' 
            ? taken.state.pos.x < -40 
            : taken.state.pos.x > 40;
    },

    _returnToPenaltyArea(taken, targetPos) {
        // Рассчитываем направление к своей штрафной
        const targetX = taken.side === 'l' ? -49.5 : 49.5;
        const dx = targetX - taken.state.pos.x;
        const dy = targetPos.y - taken.state.pos.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const angleDiff = angle - (taken.state.direction || 0);

        // Правила для плавного возврата
        if (Math.abs(angleDiff) > 30) {
            return { 
                n: 'turn', 
                v: angleDiff * 0.7,
                __comment: "Плавный поворот к штрафной" 
            };
        }
        
        return { 
            n: 'dash', 
            v: 80,
            __comment: "Возврат в штрафную зону" 
        };
    }
};

module.exports = CTRL_MIDDLE_GOALIE;