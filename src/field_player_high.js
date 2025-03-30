const CTRL_HIGH_PLAYER = {
    execute(taken, controllers, bottom, top, direction, center) {
        const fuzzy = controllers[0].fuzzy;
        const safeAngle = fuzzy.calculateSafeDirection(taken.state);
        console.log("PLAYER HIGH", safeAngle)
        if(taken.state?.ball?.dist < 2) {
            return {n: 'kick', v: `80 ${safeAngle}`};
        }
        
        const targetPos = {
            x: taken.state.ball?.x * 0.8,
            y: taken.state.ball?.y * 0.8
        };
        
        const angle = Math.atan2(targetPos.y - taken.state.pos.y,
                               targetPos.x - taken.state.pos.x) * 180/Math.PI;
        console.log("PLAYER HIGH angle=",angle)
        return Math.abs(angle) > 30 ? 
            {n: 'turn', v: angle} : 
            {n: 'dash', v: 80};
    }
};

module.exports = CTRL_HIGH_PLAYER;