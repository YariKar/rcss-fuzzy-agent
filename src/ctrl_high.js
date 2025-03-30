const FuzzyController = require('./fuzzy-controller');


const CTRL_HIGH_GOALIE = {
    execute(taken, fuzzy) {
        const targetPos = fuzzy.calculateOptimalPosition(taken.state);
        const angle = Math.atan2(targetPos.y - taken.state.pos.y,
                               targetPos.x - taken.state.pos.x) * 180/Math.PI;
        console.log("GOALIE HIGH angle=", angle)
        return Math.abs(angle) > 15 ? 
            {n: 'turn', v: angle} : 
            {n: 'dash', v: 60};
    }
};

module.exports = CTRL_HIGH_GOALIE;