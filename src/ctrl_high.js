const FuzzyController = require('./fuzzy-controller');


const CTRL_HIGH_GOALIE = {
    execute(taken, fuzzy) {
        const currentPos = taken.state.pos;
        const targetPos = fuzzy.calculateOptimalPosition(taken.state);
        
        // Проверка дистанции до цели
        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < 1.0) {
            return { n: 'turn', v: 0 }; // Остановка
        }

        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return { n: 'turn', v: angle }
    }
};

module.exports = CTRL_HIGH_GOALIE