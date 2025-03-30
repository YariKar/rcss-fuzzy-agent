const BaseController = require('./base_controller');

class GoalkeeperController extends BaseController {
  decideAction() {
    const {ball} = this.worldModel;
    const goalCenter = this.agent.side === 'l' 
      ? {distance: 52.5, direction: 0} 
      : {distance: 52.5, direction: 180};

    if (!ball) return {n: 'move', v: `${this.agent.position.x} ${this.agent.position.y}`};

    // Нечеткая логика
    const dist = this.fuzzyDistance(ball.distance);
    const dir = this.fuzzyDirection(ball.direction);

    const threatLevel = Math.min(dist.close * 1.5, dir.front * 1.2);
    
    if (threatLevel > 0.7) {
      return {n: 'catch', v: ball.direction};
    }
    
    if (ball.distance < 15) {
      return {n: 'kick', v: `100 ${goalCenter.direction}`};
    }

    return {n: 'move', v: `${this.agent.position.x} ${this.agent.position.y}`};
  }
}

module.exports = GoalkeeperController;