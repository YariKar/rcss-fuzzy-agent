const BaseController = require("./base_controller")

class GoalkeeperController extends BaseController {
    decideAction() {
      const {ball} = this.worldModel;
      const GOAL_CENTER =  {x: -50, y: 0}
      
      if (!ball) {
        return {n: 'move', v: `${GOAL_CENTER.x} ${GOAL_CENTER.y}`};
      }
  
      const ballPos = this.calculateAbsolutePosition(ball);
      const goalDist = Math.hypot(ballPos.x - GOAL_CENTER.x, ballPos.y - GOAL_CENTER.y);
      
      // Нечеткая оценка угрозы
      const threat = {
        distance: this.fuzzyDistance(goalDist),
        angle: this.fuzzyAngle(ball.direction)
      };
  
      // Правила защиты
      const interceptScore = threat.distance.veryClose * 1.5 + threat.angle.front * 1.2;
      const positionScore = threat.distance.close * 0.8 + threat.angle.slight * 0.7;
      
      if (interceptScore > 1.0) {
        return {n: 'catch', v: ball.direction};
      }
  
      if (positionScore > 0.7) {
        const targetY = Math.min(Math.max(ballPos.y, -7), 7);
        return {n: 'move', v: `${GOAL_CENTER.x} ${targetY}`};
      }
  
      return {n: 'turn', v: ball.direction};
    }
  }

  module.exports = GoalkeeperController