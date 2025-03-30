const BaseController = require('./base_controller');
const utils = require('../utils');
const Flags = require('../flags');

class GoalkeeperController extends BaseController {
  decideAction() {
    const { ball } = this.worldModel;
    const GOAL_CENTER = { x: -50, y: 0 };

    if (!ball) return { n: 'move', v: `${GOAL_CENTER.x} ${GOAL_CENTER.y}` };

    const ballPos = this.calculateBallPosition(ball);
    
    // Добавляем проверку на null
    if (!ballPos) {
      return this.handleBallPositionError(ball);
    }

    const threatLevel = this.calculateThreat(ballPos);
    
    // Логика принятия решения с проверками
    if (threatLevel > 0.8) {
      return { n: 'catch', v: ball.direction };
    }

    if (threatLevel > 0.5) {
      return this.positionToBlock(ballPos, GOAL_CENTER);
    }

    return { n: 'turn', v: ball.direction };
  }

  calculateBallPosition(ball) {
    try {
      const flags = this.worldModel.flags
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);

      if (flags.length < 2) {
        console.log('Not enough flags for triangulation');
        return null;
      }

      const agentPos = this.triangulatePosition(flags[0], flags[1]);
      
      // Проверка результата триангуляции
      if (!agentPos || !utils.isValidNumber(agentPos.x)) {
        console.log('Invalid agent position');
        return null;
      }

      const ballRel = utils.polarToCartesian(ball.distance, ball.direction);
      
      return {
        x: agentPos.x + ballRel.x,
        y: agentPos.y + ballRel.y
      };
    } catch (e) {
      console.error('Error in calculateBallPosition:', e);
      return null;
    }
  }

  handleBallPositionError(ball) {
    // Резервная логика при ошибке позиционирования
    if (ball.distance < 5) {
      return { n: 'catch', v: ball.direction };
    }
    return { n: 'turn', v: ball.direction };
  }

  positionToBlock(ballPos, goalCenter) {
    // Защита от выхода за пределы ворот
    const y = Math.min(Math.max(ballPos.y, -7), 7);
    return { n: 'move', v: `${goalCenter.x} ${y}` };
  }

  calculateThreat(ballPos) {
    try {
      const dx = ballPos.x - (-50);
      const dy = ballPos.y;
      const distance = utils.hypot(dx, dy);
      const angle = Math.abs(utils.rad2deg(Math.atan2(dy, dx)));
      
      return Math.min(1, 
        (1 - distance/30) * 0.6 + 
        (1 - angle/90) * 0.4
      );
    } catch (e) {
      console.error('Error calculating threat:', e);
      return 0;
    }
  }
}

module.exports = GoalkeeperController;