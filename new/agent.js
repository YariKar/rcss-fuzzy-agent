// agent.js
const Msg = require('./msg');
const GoalkeeperController = require('./controllers/goalie_fuzzy');
const FieldPlayerController = require('./controllers/field_player_fuzzy');

class Agent {
  constructor(params) {
    this.team = params.team;
    this.side = params.side;
    this.role = params.role;
    this.position = params.position;
    this.socket = null;
    this.action = null;
    this.state = {
      playMode: 'before_kick_off',
      ball: null,
      position: {x: 0, y: 0}
    };
    
    this.controller = this.role === 'goalie' 
      ? new GoalkeeperController(this) 
      : new FieldPlayerController(this);
  }

  setSocket(socket) {
    this.socket = socket;
  }

  async socketSend(cmd, value) {
    await this.socket.sendMsg(`(${cmd} ${value})`);
  }

  msgGot(msg) {
    try {
      const parsed = Msg.parseMsg(msg.toString());
      this.processMessage(parsed);
      this.executeAction();
    } catch (error) {
      console.error('Message processing error:', error);
    }
  }

  processMessage(msg) {
    switch(msg.cmd.toLowerCase()) {
      case 'see':
        this.processSee(msg.p);
        break;
      case 'hear':
        this.processHear(msg.p);
        break;
      case 'sense_body':
        this.processSenseBody(msg.p);
        break;
      case 'think':
        this.processThink();
        break;
    }
  }

  processSee(data) {
    const objects = this.parseSeeData(data);
    this.updateWorldModel(objects);
    this.action = this.controller.decideAction();
  }

  parseSeeData(data) {
    return data.slice(1).map(obj => {
      if (!obj?.p) return null;
      switch(obj.p[0]) {
        case 'b': return this.parseBall(obj.p.slice(1));
        case 'p': return this.parsePlayer(obj.p.slice(1));
        case 'f': return this.parseFlag(obj.p.slice(1));
        default: return null;
      }
    }).filter(Boolean);
  }

  parseBall(params) {
    return {
      type: 'ball',
      distance: params[0],
      direction: params[1],
      distChange: params[2] || 0,
      dirChange: params[3] || 0
    };
  }

  parsePlayer(params) {
    return {
      type: 'player',
      team: params[0],
      id: parseInt(params[1]),
      distance: params[2],
      direction: params[3]
    };
  }

  parseFlag(params) {
    return {
      type: 'flag',
      name: params.slice(0, -2).join(' '),
      distance: params[params.length-2],
      direction: params[params.length-1]
    };
  }

  updateWorldModel(objects) {
    this.state.ball = objects.find(o => o.type === 'ball');
    this.state.flags = objects.filter(o => o.type === 'flag');
  }

  processHear(data) {
    const [_, source, message] = data;
    if (source === 'referee') {
      this.state.playMode = message;
      this.handleRefereeCommand(message);
    }
  }

  handleRefereeCommand(command) {
    if (command === 'before_kick_off') {
      this.socketSend('move', `${this.position.x} ${this.position.y}`);
    }
    this.controller.handleRefereeCommand(command);
  }

  processSenseBody(data) {
    this.state.stamina = data.find(p => p.cmd === 'stamina')?.p[0] || 8000;
  }

  processThink() {
    if (!this.action) {
      this.action = this.controller.getDefaultAction();
    }
  }

  executeAction() {
    if (this.action && this.socket) {
      this.socketSend(this.action.n, this.action.v);
      this.action = null;
    }
  }
}

module.exports = Agent;