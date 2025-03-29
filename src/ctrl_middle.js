const CTRL_MIDDLE = {
    searchAngle: 0,
    lastBallTime: 0, // Время последнего обнаружения мяча
    
    execute(taken, controllers, fuzzy) {
        if (!taken.state.ball || taken.time - this.lastBallTime > 10) {
            this.lastBallTime = taken.time;
			const act = this.searchBall(taken);
			console.log("GOALIE MIDDLE", act)
            return act
        }
        return controllers[2].execute(taken, fuzzy);
    },
    
    searchBall(taken) {
        // Медленное сканирование с шагом 30 градусов
        this.searchAngle = (this.searchAngle + 30) % 360;
        return {
            n: "turn", 
            v: this.searchAngle,
            d: 50 // Ограничение скорости поворота
        };
    }
}


module.exports = CTRL_MIDDLE;
