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
  
    processMessage(msg) {
      // Обработка входящих сообщений от сервера
      switch(msg.cmd) {
        case 'see':
          this.processSee(msg.p);
          break;
        case 'hear':
          this.processHear(msg.p);
          break;
      }
    }
  
    processSee(data) {
      // Анализ визуальной информации
      if (this.controller) {
        this.controller.processSee(data);
      }
    }
  
    processHear(data) {
      // Обработка аудио информации
      if (this.controller) {
        this.controller.processHear(data);
      }
    }
  
    sendCommand(command) {
      if (this.socket && this.socket.sendMsg) {
        this.socket.sendMsg(command);
      }
    }
  }
  
  module.exports = Agent;