const Agent = require('./agent');
const Socket = require('./socket');
const low_ctrl = require("./field_player_low");
const high_ctrl = require("./field_player_high");
const VERSION = 7;

const goalie_low = require("./ctrl_low");
const goalie_middle = require("./ctrl_middle");
const goalie_high = require("./ctrl_high");
const FuzzyController = require('./fuzzy-controller');



function createAgent(team, goalkeeper, controllers, bottom, top, center, start_x, start_y, side='l'){

    let agent = new Agent(team, goalkeeper, side);
    agent.bottom = bottom;
    agent.top = top;
    agent.center = center;
    agent.controllers = controllers;
    agent.start_x = start_x;
    agent.start_y = start_y;
    agent.fuzzySystem = new FuzzyController(agent.position)
    return agent;
}

(async () => {
    let A_team = [
        [-45, -25, -35, -40, -30],
        [-20, 0, -35, -40, -10],
        [0, 20, -35, -40, 10],
        [25, 45, 35, -40, 30],

        [-40, -20, -25, -25, -25],
        [0, 20, -25, -25, 0],
        [20, 40, -25, -25, 25],

        [-20, 20, 0, -10, 0],
        [-40, 0, -10, -10, -20],
        [0, 40, -10, -10, 20],
    ]

    let B_team = [
        [-40, -20, -35, -40, 30],
        [-20, 0, -35, -40, 10],
        [0, 20, -35, -40, -10],
        [20, 40, 35, -40, -30],

        [-40, -20, -25, -25, 30],
        [-20, 0, -25, -25, 10],
        [0, 20, -25, -25, -10],
        [20, 40, -25, -25, -30],


        [-40, 0, -10, -10, 20],
        [0, 40, -10, -10, -20],
    ]
    let players = [];
    const side = 'l'
    const anotherSide = 'r'
    
    for (const pl of A_team){
        players.push(createAgent("A", false, [low_ctrl, high_ctrl], 
            pl[1], pl[0], pl[2], pl[3], pl[4], side))
    }
    
    
    for (const pl of B_team){
        players.push(createAgent("B", false, [low_ctrl, high_ctrl], 
            pl[1], pl[0], pl[2], pl[3], pl[4], anotherSide))
    }
    

    
    const createGoalie = (team, side) => {
        const goalie = createAgent(
            team,
            true,
            [goalie_low, goalie_middle, goalie_high], // Контроллеры
            -50, 0, 0, // Позиция
            -50, 0,
            side
        );
        goalie.taken.action = "return";
        goalie.taken.turnData = "ft0";
        return goalie;
    };
    
    let goalkeeper_A = createGoalie("A", side);
    let goalkeeper_B = createGoalie("B", anotherSide);

    await Socket(goalkeeper_A, "A", VERSION, true);
    await goalkeeper_A.socketSend('move', `${goalkeeper_A.start_x} ${goalkeeper_A.start_y}`);

    await Socket(goalkeeper_B, goalkeeper_B.teamName, VERSION, true);
    await goalkeeper_B.socketSend('move', `${goalkeeper_B.start_x} ${goalkeeper_B.start_y}`);


    for (const player of players){
        await Socket(player, player.teamName, VERSION);
        //console.log("move ", player.start_x, player.start_y);
        await player.socketSend('move', `${player.start_x} ${player.start_y}`);

    }
})();
