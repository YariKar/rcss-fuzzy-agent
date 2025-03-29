const Msg = require('./msg');

class Agent {
    constructor(params) {
      this.team = params.team;
      this.side = params.side;
      this.position = params.position; // [x, y]
      this.role = params.role; // goalie/defender/midfielder/forward
      this.controller = params.controller; // Будущий модуль управления
      this.socket = null;
    }
  
    setSocket(socket) {
      this.socket = socket;
    }

    async socketSend(cmd, value, goalie) {
        // Отправка команды
        await this.socket.sendMsg(`(${cmd} ${value})`);
    }
  
    msgGot(msg) {
      const parsed = Msg.parseMsg(msg.toString());
      this.processMessage(parsed);
    }
  
  
    processSee(data) {
      // Анализ визуальной информации
      console.log("SEE", data)
      if (this.controller) {
        this.controller.processSee(data);
      }
    }
  
    processHear(data) {
      // Обработка аудио информации
      console.log("HEAR", data)
      if (this.controller) {
        this.controller.processHear(data);
      }
    }
  
    sendCommand(command) {
      if (this.socket && this.socket.sendMsg) {
        this.socket.sendMsg(command);
      }
    }

    processMessage(msg) {
        console.log("PROCESSMSG",msg.cmd)
        switch(msg.cmd.toLowerCase()) {
            case 'see':          // Визуальная информация
                this.processSee(msg.p);
                break;
            case 'hear':         // Аудио информация
                this.processHear(msg.p);
                break;
            case 'sense_body':   // Телесные сенсоры
                this.processSenseBody(msg.p);
                break;
            case 'init':         // Инициализация игрока
                this.processInit(msg.p);
                break;
            case 'server_param': // Параметры сервера
                this.processServerParam(msg.p);
                break;
            case 'player_param': // Параметры игрока
                this.processPlayerParam(msg.p);
                break;
            case 'player_type': // Тип игрока
                this.processPlayerType(msg.p);
                break;
            case 'error':       // Ошибки
                this.processError(msg.p);
                break;
            case 'ok':          // Подтверждение команд
                this.processOk(msg.p);
                break;
            case 'warning':     // Предупреждения
                this.processWarning(msg.p);
                break;
            case 'change_player_type': // Смена типа игрока
                this.processChangePlayerType(msg.p);
                break;
            case 'score':       // Информация о счете
                this.processScore(msg.p);
                break;
            case 'think':       // Запрос на действие
                this.processThink();
                break;
            default:
                console.log('Unknown message type:', msg.cmd);
                break;
        }
    }

    // Ниже реализация обработчиков для каждого типа сообщений

    processInit(params) {
        // (init [side] [unum] [playmode])
        this.side = params[0];
        this.unum = parseInt(params[1]);
        this.playMode = params[2];
        console.log(`Initialized as ${this.side} player ${this.unum}`);
    }

    processSenseBody(params) {
        // (sense_body (view_mode [quality] [width]) (stamina [stamina] [effort]))
        console.log("SENSE BODY", params)
        this.bodyState = {};
        params.forEach(param => {
            if(param.cmd === 'view_mode') {
                this.bodyState.viewQuality = param.p[0];
                this.bodyState.viewWidth = param.p[1];
            }
            if(param.cmd === 'stamina') {
                this.bodyState.stamina = param.p[0];
                this.bodyState.effort = param.p[1];
            }
        });
    }

    processServerParam(params) {
        this.serverParams = {};
        params.forEach(param => {
            if(param.p && param.p.length >= 2) {
                this.serverParams[param.p[0]] = param.p[1];
            }
        });
    }

    processPlayerParam(params) {
        this.playerParams = {};
        params.forEach(param => {
            if(param.p && param.p.length >= 2) {
                this.playerParams[param.p[0]] = param.p[1];
            }
        });
    }

    processPlayerType(params) {
        // (player_type (id [id]) (player_speed_max [val]) ...)
        this.playerType = {};
        params.forEach(param => {
            if(param.p && param.p.length >= 2) {
                this.playerType[param.p[0]] = param.p[1];
            }
        });
    }

    processError(params) {
        console.error('Server error:', params.join(' '));
    }

    processOk(params) {
        if(params[0] === 'move') {
            console.log('Move command confirmed');
        }
    }

    processWarning(params) {
        console.warn('Server warning:', params.join(' '));
    }

    processChangePlayerType(params) {
        // (change_player_type [unum] [type])
        const unum = parseInt(params[0]);
        const type = parseInt(params[1]);
        console.log(`Player ${unum} changed type to ${type}`);
    }

    processScore(params) {
        // (score [left] [right])
        this.score = {
            left: parseInt(params[0]),
            right: parseInt(params[1])
        };
    }

    processThink() {
        // Сервер требует действий - запускаем логику принятия решений
        console.log("THINK", this.controller)
        if(this.controller) {
            this.controller.decideAction();
        }
    }
    

  }
  
  module.exports = Agent;