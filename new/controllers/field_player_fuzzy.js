const BaseController = require("./base_controller")

class FieldPlayerController extends BaseController {
    decideAction() {
      const {ball, playMode} = this.worldModel;
      const actions = [];
      
      // Правила для разных режимов игры
      if (playMode === 'before_kick_off') {
        return {n: 'move', v: `${this.agent.position.x} ${this.agent.position.y}`};
      }
  
      if (!ball) {
        return {n: 'turn', v: '60'};
      }
  
      // Нечеткая оценка ситуации
      const dist = this.fuzzyDistance(ball.distance);
      const angle = this.fuzzyAngle(ball.direction);
      
      // Правила атаки
      const attackScore = dist.close * 0.8 + angle.front * 1.2;
      actions.push({
        type: 'kick',
        power: 80 + 20 * dist.veryClose,
        angle: ball.direction,
        score: attackScore
      });
  
      // Правила преследования
      const chaseScore = dist.medium * 0.6 + angle.slight * 0.9;
      actions.push({
        type: 'dash',
        power: 90 + 10 * (1 - dist.medium),
        score: chaseScore
      });
  
      // Правила поиска
      actions.push({
        type: 'turn',
        angle: ball.direction,
        score: angle.side * 0.7 + dist.far * 0.5
      });
  
      const bestAction = this.defuzzify(actions);
      
      switch(bestAction.type) {
        case 'kick':
          return {n: 'kick', v: `${bestAction.power} ${bestAction.angle}`};
        case 'dash':
          return {n: 'dash', v: bestAction.power};
        default:
          return {n: 'turn', v: bestAction.angle};
      }
    }
  }

module.exports = FieldPlayerController