const CTRL_LOW = {
	name: "goalie_low",
	execute(taken, controllers){
		const next = controllers.slice(1)[0];
		taken.canKick = taken.state.ball && taken.state.ball.dist < 0.5;
		//taken.canCatch = taken.state.ball && taken.state.ball.dist < 2;
		if (next){
			console.log(`GOALIEDEBUG ${next.name} ${taken.action}`)
			return next.execute(taken, controllers.slice(1));
		} 
	}
}

module.exports = CTRL_LOW;