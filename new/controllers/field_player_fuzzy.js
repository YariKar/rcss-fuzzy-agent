const BaseController = require('./base_controller');

class FieldPlayerController extends BaseController {
    decideAction() {
        if (!this.worldModel.ball) {
          return {n: 'turn', v: '60'}; // Активный поиск мяча
        }
    
        const ball = this.worldModel.ball;
        const goal = this.worldModel.flags.find(f => 
          f.name === (this.agent.side === 'l' ? 'f g r' : 'f g l')
        );
    
        // Нечеткая логика с приоритетом на поиск мяча
        const ballProximity = 1 - Math.min(ball.distance / 30, 1);
        const shouldAttack = ballProximity > 0.7;
    
        if (shouldAttack) {
          return {
            n: 'kick',
            v: `100 ${goal?.direction || (this.agent.side === 'l' ? 0 : 180)}`
          };
        }
    
        if (Math.abs(ball.direction) > 10) {
          return {n: 'turn', v: ball.direction};
        }
    
        return {n: 'dash', v: '100'};
      }
}

module.exports = FieldPlayerController;