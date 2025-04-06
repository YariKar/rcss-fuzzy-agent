const utils = require("./utils")
const calculations = require("./calculations")


module.exports = {

    positioning(taken){
        const y = taken.state.pos?.y || taken.last_pos.pos.y
        const bottom = taken.bottom
        const top = taken.top
        if (y <= bottom && y >= top){
            //TODO
            return [{n: "turn", v: -10}, {n: "turn", v: 5}];
        }
        let keys = Object.keys(taken.state.all_flags);
        for (const key of keys) {
            let flag = taken.state.all_flags[key];
            if (flag.y <= bottom && flag.y >= top){
                if (Math.abs(flag.angle) > 5){
                    return [{n: "turn", v: flag.angle}, {n: "dash", v: 80}];    
                }
                return {n: "dash", v: 80};
            }
        }
        return {n: "turn", v: 45};
    },

    takeBall(taken){

    },

    moveToBall(taken) {
        const angleDiff = taken.state.ball?.angle
        const ballDist = taken.state.ball?.dist
        const TURN_THRESHOLD = 15; // Порог для поворота
        
        if (Math.abs(angleDiff) > TURN_THRESHOLD) {
            return { n: "turn", v: angleDiff }
        }
        
        const dashPower = Math.min(100, ballDist * 20); // Коэффициент скорости
        return { n: "dash", v: dashPower }
    }

}