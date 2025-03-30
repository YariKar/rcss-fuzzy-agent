const BaseController = require("./base_controller")

class FieldPlayerController extends BaseController {
    constructor(agent) {
        super(agent);
        this.aggressiveness = this.getRoleAggressiveness();
        this.homePosition = this.agent.position;
    }

    getRoleAggressiveness() {
        switch(this.agent.role) {
            case 'defender': return 0.3;
            case 'midfielder': return 0.6;
            case 'forward': return 0.9;
            default: return 0.5;
        }
    }

    decideAction() {
        if (this.isBallClose()) {
            return this.handleBallPossession();
        }
        
        const attackChance = this.calculateAttackChance();
        if (attackChance > 0.7) {
            return this.attack();
        }
        return this.positioning();
    }

    calculateAttackChance() {
        const ball = this.worldModel.ball;
        const goal = this.findOpponentGoal();
        
        const distToBall = this.fuzzyDistance(ball.distance);
        const angleToGoal = this.fuzzyAngle(goal.direction);
        
        return Math.min(
            distToBall.near * 1.2,
            angleToGoal.front * this.aggressiveness
        );
    }

    handleBallPossession() {
        const teammates = this.worldModel.teammates;
        const bestPass = this.findBestPassReceiver();
        
        if (bestPass && Math.random() < 0.6) {
            this.agent.socketSend('kick', `${bestPass.direction} 40`);
        } else {
            this.agent.socketSend('kick', '100 0');
        }
    }

    findBestPassReceiver() {
        return this.worldModel.teammates
            .filter(p => p.distance > 10 && p.distance < 30)
            .sort((a,b) => b.distance - a.distance)[0];
    }

    attack() {
        const goal = this.findOpponentGoal();
        this.agent.socketSend('dash', '100');
        if (goal) {
            this.agent.socketSend('turn', goal.direction);
        }
    }

    findOpponentGoal() {
        return this.worldModel.flags.find(f => 
            this.agent.side === 'l' ? f.name === 'f g r' : f.name === 'f g l'
        );
    }

    positioning() {
        const ballDirection = this.worldModel.ball?.direction || 0;
        const positionOffset = this.getPositionOffset();
        
        this.agent.socketSend('move', 
            `${this.homePosition.x + positionOffset.x} 
            ${this.homePosition.y + positionOffset.y}`);
    }

    getPositionOffset() {
        switch(this.agent.role) {
            case 'defender':
                return {x: -5, y: 0};
            case 'midfielder':
                return {x: 10, y: Math.sin(Date.now()/1000)*5};
            case 'forward':
                return {x: 20, y: 0};
            default:
                return {x: 0, y: 0};
        }
    }
}

module.exports = FieldPlayerController