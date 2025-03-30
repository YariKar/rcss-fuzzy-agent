const BaseController = require('./base_controller');

class FieldPlayerController extends BaseController {
  decideAction() {
    const {ball} = this.worldModel;
    const goal = this.worldModel.flags.find(f => 
      f.name === (this.agent.side === 'l' ? 'f g r' : 'f g l')
    );

    if (!ball) return this.getDefaultAction();

    // Нечеткая логика
    const ballDist = this.fuzzyDistance(ball.distance);
    const goalDist = goal ? this.fuzzyDistance(goal.distance) : {far: 1};
    
    const attackUrgency = ballDist.close * 0.8 + goalDist.far * 0.2;
    
    if (attackUrgency > 0.7) {
      return {
        n: 'kick',
        v: `100 ${goal ? goal.direction : this.agent.side === 'l' ? 0 : 180}`
      };
    }

    if (ballDist.close > 0.3) {
      return {n: 'turn', v: ball.direction};
    }

    return {n: 'dash', v: '100'};
  }
}

module.exports = FieldPlayerController;