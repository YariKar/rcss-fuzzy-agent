const FuzzyController = require('./fuzzy-controller');


const CTRL_HIGH = {
    execute(taken, fuzzy) {
        // 1. Рассчитать целевую позицию
        const targetPos = fuzzy.calculateOptimalPosition(taken.state);
        
        // 2. Определить действие для движения к позиции
        const angle = Math.atan2(targetPos.y - taken.state.pos.y,
                               targetPos.x - taken.state.pos.x) * 180/Math.PI;
        
        return Math.abs(angle) > 15 
            ? { n: "turn", v: angle }
            : { n: "dash", v: 60 };
    }
};
module.exports = CTRL_HIGH;