class BaseController {
    constructor(agent) {
      this.agent = agent;
      this.worldModel = {
        ball: null,
        flags: [],
        playMode: 'before_kick_off'
      };
    }
  
    updateWorldModel(objects) {
        console.log("UPDATE WORD MODEL", objects)
      this.worldModel.ball = objects.find(o => o.type === 'ball');
      this.worldModel.flags = objects.filter(o => o.type === 'flag');
    }
  
    handleRefereeCommand(command) {
      this.worldModel.playMode = command;
    }
  
    getDefaultAction() {
        if (this.worldModel.ball) {
          if (this.worldModel.ball.distance < 2.0) {
            return {n: 'kick', v: '100 0'};
          }
          return {n: 'dash', v: '80'};
        }
        // Поворот для поиска мяча
        return {n: 'turn', v: '60'};
      }
  
    // Нечеткие функции
    fuzzyDistance(d) {
      return {
        close: Math.max(0, 1 - d/5),
        medium: Math.exp(-Math.pow(d-7, 2)/8),
        far: Math.tanh(d/10)
      };
    }
  
    fuzzyDirection(a) {
      const absAngle = Math.abs(a);
      return {
        front: Math.max(0, 1 - absAngle/30),
        side: Math.exp(-Math.pow(absAngle-45, 2)/800),
        back: Math.max(0, absAngle/60 - 0.5)
      };
    }
  }
  
  module.exports = BaseController;