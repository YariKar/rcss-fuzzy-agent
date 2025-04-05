const Msg = require('./msg');
const Flags = require('./flags');
const utils = require('./utils');
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
      pos: {x: 0, y: 0},
      stamina: 8000,
      direction: 0
    };
    
    this.controller = this.role === 'goalie' 
      ? new GoalkeeperController(this) 
      : new FieldPlayerController(this);
    
    this.initPosition();
  }

  initPosition() {
    const positions = {
      'goalie': {x: -50, y: 0},
      'defender': {x: -35, y: 0},
      'forward': {x: -20, y: 0}
    };
    this.startPos = positions[this.role] || {x: -30, y: 0};
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
      case 'init':
        this.processInit(msg.p);
        break;
    }
  }

  processInit(params) {
    if (params[0] === 'r') this.side = 'r';
    if (params[1]) this.id = parseInt(params[1]);
    console.log(`Initialized as ${this.side} player ${this.id}`);
  }

  processSee(data) {
    const objects = this.parseSeeData(data);
    this.controller.updateWorldModel(objects);
    this.state.ball = objects.find(o => o?.type === 'ball');
    this.action = this.controller.decideAction();
  }

  parseSeeData(data) {
    const objects = [];
    for (const item of data) {
      try {
        if (!item?.cmd?.p) continue;
        
        const type = item.cmd.p[0];
        switch(type) {
          case 'b':
            if (item.p.length >= 2) {
              objects.push(this.parseBall(item));
            }
            break;
          case 'p':
            if (item.p.length >= 2) {
              objects.push(this.parsePlayer(item));
            }
            break;
          case 'f':
            if (item.p.length >= 2) {
              objects.push(this.parseFlag(item));
            }
            break;
        }
      } catch (e) {
        console.error('Error parsing see object:', e);
      }
    }
    return objects;
  }

  parseBall(item) {
    return {
      type: 'ball',
      distance: parseFloat(item.p[0]),
      direction: parseFloat(item.p[1]),
      distChange: item.p[2] ? parseFloat(item.p[2]) : 0,
      dirChange: item.p[3] ? parseFloat(item.p[3]) : 0
    };
  }

  parsePlayer(item) {
    return {
      type: 'player',
      team: item.cmd.p[1]?.replace(/"/g, '') || 'unknown',
      id: item.cmd.p[2] ? parseInt(item.cmd.p[2]) : null,
      distance: parseFloat(item.p[0]),
      direction: parseFloat(item.p[1])
    };
  }

  parseFlag(item) {
    return {
      type: 'flag',
      name: item.cmd.p.slice(1).join(' '),
      distance: parseFloat(item.p[0]),
      direction: parseFloat(item.p[1])
    };
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
      this.socketSend('move', `${this.startPos.x} ${this.startPos.y}`);
    }
    this.controller.handleGameEvent(command);
  }

  processSenseBody(data) {
    try {
      this.state.stamina = data.find(p => p?.cmd === 'stamina')?.p?.[0] || 8000;
      this.state.direction = data.find(p => p?.cmd === 'head_angle')?.p?.[0] || 0;
    } catch (e) {
      console.error('Error processing sense body:', e);
    }
  }

  async executeAction() {
    if (!this.action) return;
    
    if (this.socket) {
      await this.socketSend(this.action.n, this.action.v);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.action = null;
  }
}

module.exports = Agent;