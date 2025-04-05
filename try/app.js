const Agent = require('./agent');
const Socket = require('./socket');

const version = 7;
const PLAYERS_PER_TEAM = 11;

const teamName = "Puck"
const teamName2 = "B"

const side = 'l'
const side2 = 'r'


// Координаты для расстановки 4-4-2 (левая сторона)
const formation = {
    l: {
      goalie: { x: -50, y: 0 },
      defenders: [
        { x: -35, y: -20 },
        { x: -35, y: -10 },
        { x: -35, y: 10 },
        { x: -35, y: 20 }
      ],
      midfielders: [
        { x: -25, y: -25 },
        { x: -25, y: -5 },
        { x: -25, y: 5 },
        { x: -25, y: 25 }
      ],
      forwards: [
        { x: -10, y: -10 },
        { x: -10, y: 10 }
      ]
    }
  };
  
  // Зеркальная расстановка для правой стороны
  formation.r = JSON.parse(JSON.stringify(formation.l));
  formation.r.goalie.x;
  formation.r.defenders.forEach(p => p.x);
  formation.r.midfielders.forEach(p => p.x);
  formation.r.forwards.forEach(p => p.x);


  class App {
    constructor() {
      this.agents = [];
    }
  
    async init() {
      // Создаем игроков для первой команды (левая сторона)
      await this.createTeam(teamName, 'l');
      
      // Создаем игроков для второй команды (правая сторона)
      await this.createTeam(teamName2, 'r');
    }
  
    async createTeam(team, side) {
      // Создаем вратаря
      const goaliePos = formation[side].goalie;
      const goalie = new Agent({
        team,
        side,
        position: {"x": goaliePos.x, "y": goaliePos.y},
        role: 'goalie',
        controller: null
      });
      await Socket(goalie, team, version, true);
      this.agents.push(goalie);
      await goalie.socketSend('move', `${goalie.position.x} ${goalie.position.y}`);
  
      // Создаем защитников
      for (const pos of formation[side].defenders) {
        const agent = new Agent({
          team,
          side,
          position: {"x": pos.x, "y": pos.y},
          role: 'defender',
          controller: null
        });
        await Socket(agent, team, version);
        this.agents.push(agent);
        await agent.socketSend('move', `${agent.position.x} ${agent.position.y}`);
      }
  
      // Создаем полузащитников
      for (const pos of formation[side].midfielders) {
        const agent = new Agent({
          team,
          side,
          position: {"x": pos.x, "y": pos.y},
          role: 'midfielder',
          controller: null
        });
        await Socket(agent, team, version);
        this.agents.push(agent);
        await agent.socketSend('move', `${agent.position.x} ${agent.position.y}`);
      }
  
      // Создаем нападающих
      for (const pos of formation[side].forwards) {
        const agent = new Agent({
          team,
          side,
          position: {"x": pos.x, "y": pos.y},
          role: 'forward',
          controller: null
        });
        await Socket(agent, team, version);
        this.agents.push(agent);
        await agent.socketSend('move', `${agent.position.x} ${agent.position.y}`);
      }
    }
  }
  
  // Запуск приложения
  const app = new App();
  app.init().catch(console.error);


