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

  processInit(params) {
    this.state.unum = parseInt(params[1]);
    console.log(`Initialized as ${this.side} player ${this.state.unum}`);
    this.socketSend('change_view', 'high normal'); // Устанавливаем нормальный обзор
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

  // Модифицируем метод обработки see
  processSee(data) {
    console.log('Raw see data:', data);
    const objects = this.parseSeeData(data);
    console.log('Parsed objects:', objects);
    this.updateWorldModel(objects);
    this.action = this.controller.decideAction();
  }

  parseSeeData(data) {
    const objects = [];
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      if (!item?.cmd?.p) continue;
  
      try {
        const type = item.cmd.p[0];
        const params = item.p;
  
        switch(type) {
          case 'b': // Обработка мяча
            if (params.length >= 2) {
              objects.push({
                type: 'ball',
                distance: parseFloat(params[0]),
                direction: parseFloat(params[1]),
                distChange: params[2] ? parseFloat(params[2]) : 0,
                dirChange: params[3] ? parseFloat(params[3]) : 0
              });
            }
            break;
  
          case 'p': // Обработка игроков
            const playerData = item.cmd.p;
            const team = playerData[1]?.replace(/"/g, '') || 'unknown';
            const id = playerData[2] ? parseInt(playerData[2]) : null;
            
            if (params.length >= 2) {
              objects.push({
                type: 'player',
                team,
                id,
                distance: parseFloat(params[0]),
                direction: parseFloat(params[1])
              });
            }
            break;
  
          case 'f': // Обработка флагов
            const flagName = item.cmd.p.slice(1).join(' ');
            if (params.length >= 2) {
              objects.push({
                type: 'flag',
                name: flagName,
                distance: parseFloat(params[0]),
                direction: parseFloat(params[1])
              });
            }
            break;
  
          default:
            // Игнорируем другие объекты (g, l и т.д.)
        }
      } catch (e) {
        console.error('Parse error:', e, 'Item:', JSON.stringify(item));
      }
    }
    return objects;
  }

  updateWorldModel(objects) {
    console.log("UPDATE WORLD MODEL", objects);
    // Передаем данные в контроллер
    this.controller.updateWorldModel(objects);
    // Также обновляем состояние агента
    this.state.ball = objects.find(o => o?.type === 'ball');
    this.state.flags = objects.filter(o => o?.type === 'flag');
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

  async executeAction() {
    if (!this.action) return;
    
    console.log("EXECUTE ACTION:", this.action);
    if (this.socket) {
      await this.socketSend(this.action.n, this.action.v);
      await new Promise(resolve => setTimeout(resolve, 50)); // Задержка
    }
    this.action = null;
  }
}

module.exports = Agent;