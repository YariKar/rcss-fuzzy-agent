// field_player_fuzzy.js
const BaseController = require('./base_controller');

class FieldPlayerController extends BaseController {
  decideAction() {
    const {ball, playMode} = this.worldModel;
    
    if (playMode === 'before_kick_off') {
      return {n: 'move', v: `${this.agent.startPos.x} ${this.agent.startPos.y}`};
    }

    if (!ball) return {n: 'turn', v: 60};

    const ballDist = this.fuzzyDistance(ball.distance);
    const ballAngle = this.fuzzyAngle(ball.direction);
    const goalDist = this.calculateGoalDistance();
    console.log("PLAYER DECIDE", ball, ballDist, ballAngle, goalDist)
    const rules = [
      this.ruleKick(ballDist, ballAngle),
      this.ruleDash(ballDist, ballAngle),
      this.ruleTurn(ballDist, ballAngle),
      this.ruleReturnToPosition(goalDist)
    ];

    return this.defuzzify(rules);
  }

  ruleKick(dist, angle) {
    const score = dist.veryClose * 1.5 + angle.front * 1.2;
    return {
      type: 'kick',
      power: 80 + 20 * dist.veryClose,
      angle: ball.direction,
      score: Math.min(score, 1)
    };
  }

  ruleDash(dist, angle) {
    const score = dist.medium * 0.6 + angle.slight * 0.9;
    return {
      type: 'dash',
      power: 90 + 10 * (1 - dist.medium),
      score: Math.min(score, 1)
    };
  }

  ruleTurn(dist, angle) {
    return {
      type: 'turn',
      angle: ball.direction,
      score: angle.side * 0.7 + dist.far * 0.5
    };
  }

  ruleReturnToPosition(goalDist) {
    if (goalDist > 30) {
      return {
        type: 'move',
        target: this.agent.startPos,
        score: 0.8
      };
    }
    return {score: 0};
  }

  defuzzify(actions) {
    let best = {score: -Infinity};
    for (const action of actions) {
      if (action.score > best.score) best = action;
    }
    
    switch(best.type) {
      case 'kick': return {n: 'kick', v: `${best.power} ${best.angle}`};
      case 'dash': return {n: 'dash', v: best.power};
      case 'move': return {n: 'move', v: `${best.target.x} ${best.target.y}`};
      default: return {n: 'turn', v: best.angle || 60};
    }
  }

  calculateGoalDistance() {
    const goalPos = this.agent.side === 'l' ? {x: 52.5, y: 0} : {x: -52.5, y: 0};
    return Math.hypot(
      this.worldModel.position.x - goalPos.x,
      this.worldModel.position.y - goalPos.y
    );
  }
}

module.exports = FieldPlayerController;