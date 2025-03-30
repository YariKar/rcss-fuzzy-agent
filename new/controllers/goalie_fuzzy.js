const BaseController = require("./base_controller")

class GoalkeeperController extends BaseController {
    constructor(agent) {
        super(agent);
        this.homePosition = this.agent.position;
    }

    decideAction() {
        if (this.worldModel.playMode.includes('free_kick')) {
            return this.agent.socketSend('kick', '100 45');
        }

        if (this.agent.side === 'l') {
            if (this.worldModel.ball?.distance < 20 && this.worldModel.ball?.direction > -30 && this.worldModel.ball?.direction < 30) {
                return this.agent.socketSend('catch', this.worldModel.ball.direction);
            }
        }

        const ballThreat = this.calculateBallThreat();
        if (ballThreat > 0.7) {
            return this.defendGoal();
        }
        return this.returnToPosition();
    }

    calculateBallThreat() {
        const ball = this.worldModel.ball;
        if (!ball) return 0;
        
        const distFuzz = this.fuzzyDistance(ball.distance);
        const angleFuzz = this.fuzzyAngle(ball.direction);
        return Math.min(
            distFuzz.veryNear * 1.5,
            angleFuzz.front * 1.2
        );
    }

    defendGoal() {
        if (this.worldModel.ball) {
            this.agent.socketSend('move', `${this.worldModel.ball.direction} ${this.worldModel.ball.distance}`);
            if (this.worldModel.ball.distance < 1.5) {
                this.agent.socketSend('kick', '100 45');
            }
        }
    }

    returnToPosition() {
        const dx = this.homePosition.x - this.bodyState.x;
        const dy = this.homePosition.y - this.bodyState.y;
        this.agent.socketSend('move', `${Math.atan2(dy, dx)} ${Math.hypot(dx, dy)}`);
    }
}

module.exports = GoalkeeperController