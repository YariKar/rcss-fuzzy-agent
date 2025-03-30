const Msg = require('./msg');
const utils = require("./utils");
const GoalkeeperController = require("./controllers/goalie_fuzzy")
const FieldPlayerController = require("./controllers/field_player_fuzzy")


class Agent {
    constructor(params) {
        this.team = params.team;
        this.side = params.side;
        this.position = params.position;
        this.role = params.role;
        this.socket = null;
        this.run = false;
        this.start_x = params.position.x;
        this.start_y = params.position.y;
        this.state = {
            pos: {x: 0, y: 0},
            ball: null,
            playMode: 'before_kick_off'
        };
        this.initController();
        this.act = null;
    }
    initController() {
        switch(this.role) {
            case 'goalie':
                this.controller = new GoalkeeperController(this);
                break;
            default:
                this.controller = new FieldPlayerController(this);
        }
    }
  
    setSocket(socket) {
      this.socket = socket;
    }

    async socketSend(cmd, value, goalie) {
        // Отправка команды
        await this.socket.sendMsg(`(${cmd} ${value})`);
    }
  
    msgGot(msg) {
        // try{
        //     const parsed = Msg.parseMsg(msg.toString());
        //     this.processMessage(parsed);
        // } catch{
        //     console.error('exception while got msg', error);
        // }
        const parsed = Msg.parseMsg(msg.toString());
        this.processMessage(parsed);
      
    }
  
  
    processSee(data) {
        try {
            const objects = this.parseSeeData(data);
            this.updatePosition(objects);
            this.updateBallPosition(objects);
            
            if (this.controller) {
                this.controller.updateWorldModel(objects);
            }
        } catch (error) {
            console.error('Error processing see data:', error);
        }
    }
    updatePosition(objects) {
        const flags = objects.filter(o => o.type === 'flag');
        if (flags.length >= 2) {
            const [flag1, flag2] = flags;
            this.state.pos = utils.calculatePositionFromFlags(
                flag1,
                flag2,
                this.side
            );
        }
    }

    updateBallPosition(objects) {
        const ball = objects.find(o => o.type === 'ball');
        if (ball) {
            this.state.ball = {
                ...ball,
                ...this.calculateBallCoordinates(ball)
            };
        } else {
            this.state.ball = null;
        }
    }

    calculateBallCoordinates(ball) {
        // Конвертация полярных координат в декартовы
        const angleRad = ball.direction * Math.PI / 180;
        return {
            x: this.state.pos.x + ball.distance * Math.cos(angleRad),
            y: this.state.pos.y + ball.distance * Math.sin(angleRad)
        };
    }


    parseSeeData(data) {
        return data
            .slice(1) // Пропускаем первый элемент (временную метку)
            .map(obj => {
                try {
                    if(!obj || !obj.p) return null;
                    
                    const params = obj.p;
                    if(params.length === 0) return null;

                    switch(params[0]) {
                        case 'b':
                            return this.parseBall(params.slice(1));
                        case 'p':
                            return this.parsePlayer(params.slice(1));
                        case 'f':
                            return this.parseFlag(params.slice(1));
                        default:
                            return null;
                    }
                } catch (parseError) {
                    console.error('Error parsing object:', obj, parseError);
                    return null;
                }
            })
            .filter(Boolean); // Фильтруем null и undefined
    }

    parseBall(params) {
        try {
            return {
                type: 'ball',
                distance: params[0],
                direction: params[1],
                distChange: params[2] || 0,
                dirChange: params[3] || 0
            };
        } catch (error) {
            console.error('Error parsing ball:', params, error);
            return null;
        }
    }

    parsePlayer(params) {
        try {
            // Пример параметров: ["Puck", 8, 11, -27, 0, 0, 0, 0]
            return {
                type: 'player',
                team: params[0],
                id: parseInt(params[1]),
                distance: params[2],
                direction: params[3],
                distChange: params[4] || 0,
                dirChange: params[5] || 0
            };
        } catch (error) {
            console.error('Error parsing player:', params, error);
            return null;
        }
    }

    parseFlag(params) {
        try {
            // Пример параметров: ["g", "r"] или ["r", "t", 10]
            return {
                type: 'flag',
                name: params.join(' ').trim(),
                distance: params[params.length - 2],
                direction: params[params.length - 1]
            };
        } catch (error) {
            console.error('Error parsing flag:', params, error);
            return null;
        }
    }
    processHear(data) {
        const [time, source, message] = data;
        if (source === 'referee') {
            this.state.playMode = message;
            this.handleRefereeCommand(message);
        }
        
        if (this.controller) {
            this.controller.processHear(data);
        }
    }

    handleRefereeCommand(command) {
        switch(command) {
            case 'play_on':
            case 'kick_off_l':
            case 'kick_off_r':
                this.run = true;
                break;
            case 'before_kick_off':
                this.socketSend('move', `${this.start_x} ${this.start_y}`);
                break;
            case 'goal_l':
            case 'goal_r':
                this.run = false;
                this.socketSend('move', `${this.start_x} ${this.start_y}`);
                break;
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
        this.state.unum = parseInt(params[1]);
        console.log(`Initialized as ${this.side} player ${this.state.unum}`);
    }

    processSenseBody(data) {
        this.state.stamina = data.find(p => p.cmd === 'stamina')?.p[0] || 8000;
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
        if (!this.run) return;

        let action = null;
        if (this.controller) {
            action = this.controller.decideAction();
        }

        if (!action) {
            action = this.getDefaultAction();
        }

        if (action) {
            this.socketSend(action.n, action.v);
        }
    }

    getDefaultAction() {
        if (this.state.ball) {
            if (this.state.ball.distance < 1.5) {
                return {n: 'kick', v: `100 ${this.getKickDirection()}`};
            }
            return {n: 'turn', v: this.state.ball.direction};
        }
        return {n: 'dash', v: '80'};
    }
    

    getKickDirection() {
        if (this.role === 'goalie') return 45;
        return this.side === 'l' ? 0 : 180;
    }

  }
  
  module.exports = Agent;