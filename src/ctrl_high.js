const FuzzyController = require('./fuzzy-controller');


const CTRL_HIGH = {
    lastAction: null,
	fuzzySystem: null,
    basePosition: {x: -50, y: 0},
    
    execute(input, controllers, fuzzySystem) {
		this.fuzzySystem = fuzzySystem
        const ball = input.state.ball;
		console.log("FUZZY ball", input.state.ball)
        if (!ball || ball.dist > 60) return this.defendBasePosition();

        const reaction = fuzzySystem.evaluate(ball);
		console.log("FUZZY reaction", reaction )
        if (!reaction || !reaction.action){
			return this.defendBasePosition();
		}
        switch(reaction.action) {
            case 'catch':
                return this.handleCatch(ball);
                
            case 'intercept':
                return this.interceptBall(ball);
                
            case 'track':
                return this.trackBall(ball);
                
            default:
                return this.defendBasePosition();
        }
    },

	handleCatch(ball) {
        return { 
            n: "dash", 
            v: Math.min(100, 80 + (5 - ball.dist) * 20)
        };
    },

	interceptBall(ball) {
        const targetPos = this.predictPosition(ball);
        const angle = this.calculateAngle(targetPos);
        
        return Math.abs(angle) > 10 
            ? { n: "turn", v: angle }
            : { n: "dash", v: 100 };
    },

    trackBall(ball) {
        return Math.abs(ball.angle) > 5
            ? { n: "turn", v: ball.angle }
            : { n: "dash", v: 50 };
    },

    predictPosition(ball) {
        const speed = this.fuzzySystem.calculateBallSpeed();
        return {
            x: ball.x + speed * Math.cos(ball.angle * Math.PI/180) * 0.8,
            y: ball.y + speed * Math.sin(ball.angle * Math.PI/180) * 0.8
        };
    },

    criticalReaction(input) {
        if(input.canCatch) {
            this.lastAction = "catch";
            return {n: "catch", v: input.state.ball.angle};
        }
        
        if(input.canKick) {
            this.lastAction = "kick";
            return this.emergencyKick(input);
        }

        return this.defensiveDash(input.state.ball);
    },

    normalBehavior(input) {
        if(input.state.ball && input.state.ball.dist < 15) {
            return this.trackBall(input.state.ball);
        }
        return this.defendBasePosition();
    },

    trackBall(ball) {
        if(Math.abs(ball.angle) > 5) {
            return {n: "turn", v: ball.angle};
        }
        return {n: "dash", v: 80};
    },

    defendBasePosition() {
        return {
            n: "move",
            v: `${this.basePosition.x} ${this.basePosition.y}`
        };
    },

    emergencyKick(input) {
        const targetAngle = input.state.rival_goal.angle || 180;
        return {n: "kick", v: `100 ${targetAngle}`};
    },

    defensiveDash(ball) {
        const dashPower = Math.min(100, 50 + ball.dist * 3);
        return {n: "dash", v: dashPower};
    },

    predictBallPosition(ball) {
        return {
            x: ball.x + (ball.velocityX || 0) * 0.5,
            y: ball.y + (ball.velocityY || 0) * 0.5
        };
    },

    calculateDashPower(distance) {
        return Math.min(100, 70 + distance * 2);
    },

	calculateAngleToPosition(targetPos) {
		const currentPos = this.agent.state.pos;
		if (!currentPos || !targetPos) return 0;
		
		const dx = targetPos.x - currentPos.x;
		const dy = targetPos.y - currentPos.y;
		return Math.atan2(dy, dx) * (180/Math.PI);
	}
}

module.exports = CTRL_HIGH;