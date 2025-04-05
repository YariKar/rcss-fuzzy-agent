const utils = require('../utils');
const Flags = require('../flags')

class BaseController {
  constructor(agent) {
    this.agent = agent;
    this.worldModel = {
      ball: null,
      flags: [],
      players: [],
      playMode: 'before_kick_off',
      position: {x: 0, y: 0}
    };
  }

  updateWorldModel(objects) {
    this.worldModel.ball = objects.find(o => o?.type === 'ball');
    this.worldModel.flags = objects.filter(o => o?.type === 'flag');
    this.worldModel.players = objects.filter(o => o?.type === 'player');
    this.calculatePosition();
  }

  calculatePosition() {
    const flags = this.worldModel.flags
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    if (flags.length >= 2) {
      const [flag1, flag2] = flags;
      const pos = this.triangulatePosition(flag1, flag2);
      if (pos) this.worldModel.position = pos;
    }
  }

  triangulatePosition(flag1, flag2) {
    const f1Pos = Flags[flag1.name];
    const f2Pos = Flags[flag2.name];
    if (!f1Pos || !f2Pos) return null;

    const toCartesian = (distance, angle) => ({
      x: distance * Math.cos(utils.deg2rad(angle)),
      y: distance * Math.sin(utils.deg2rad(angle))
    });

    const f1Rel = toCartesian(flag1.distance, flag1.direction);
    const f2Rel = toCartesian(flag2.distance, flag2.direction);

    const agentX = (f1Pos.x - f1Rel.x + f2Pos.x - f2Rel.x) / 2;
    const agentY = (f1Pos.y - f1Rel.y + f2Pos.y - f2Rel.y) / 2;

    return {x: agentX, y: agentY};
  }

  fuzzyDistance(d) {
    return {
      veryClose: Math.max(0, 1 - d/3),
      close: Math.max(0, (5 - d)/5),
      medium: Math.exp(-Math.pow((d - 10)/5, 2)),
      far: Math.tanh(d/20)
    };
  }

  fuzzyAngle(a) {
    const absA = Math.abs(a);
    return {
      front: Math.max(0, 1 - absA/30),
      slight: Math.exp(-Math.pow((absA - 15)/10, 2)),
      side: Math.exp(-Math.pow((absA - 45)/20, 2)),
      back: Math.max(0, (absA - 90)/90)
    };
  }

  handleGameEvent(event) {
    this.worldModel.playMode = event
    if (event === 'goal') {
      this.worldModel.ball = null;
    }
  }
}

module.exports = BaseController;