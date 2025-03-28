const CTRL_LOW = {
    name: "goalie_low",
    execute(taken, controllers, fuzzySystem) { // Добавляем параметр
        const next = controllers.slice(1)[0];
		if (taken.state.ball){
			taken.canKick = taken.state.ball.dist < 0.5;
			// Интеграция оценки угрозы
			const threatLevel = fuzzySystem.evaluate(taken.state.ball);
			if(threatLevel > 0.7) {
				return {n: "catch", v: taken.state.ball.angle};
			}
		}
        if(next) {
			//console.log("FUZZY low", fuzzySystem)
            return next.execute(taken, controllers.slice(1), fuzzySystem);
        }
    }
}

module.exports = CTRL_LOW;