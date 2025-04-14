const Agent = require('./agent');
const Socket = require('./socket');
const VERSION = 7;

const FuzzyController = require('./fuzzy-controller');
const FuzzyControllerGoalie = require('./fuzzy-controller-goalie');
const teamName = "Puck"
const anotherTeamName = "B"

function createAgent(team, goalkeeper, bottom, top, center, start_x, start_y, number = -1, defaultNearestTeammate) {

    let agent = new Agent(team, goalkeeper, number);
    agent.bottom = bottom;
    agent.top = top;
    agent.center = center;
    agent.start_x = start_x;
    agent.start_y = start_y;
    agent.taken.start_x = start_x
    agent.taken.start_y = start_y
    agent.taken.top = top
    agent.taken.bottom = bottom
    agent.taken.center = center
    agent.taken.last_seen_teammate = {
        dist: null,
        angle: null,
        x: defaultNearestTeammate[3],
        y: defaultNearestTeammate[4]
    }
    if (goalkeeper) {
        agent.fuzzySystem = new FuzzyControllerGoalie();
    } else {
        agent.fuzzySystem = new FuzzyController()
    }

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

    // let B_team = [
    //     [-40, -20, -35, -40, 30],
    //     [-20, 0, -35, -40, 10],
    //     [0, 20, -35, -40, -10],
    //     [20, 40, 35, -40, -30],

    //     [-40, -20, -25, -25, 30],
    //     [-20, 0, -25, -25, 10],
    //     [0, 20, -25, -25, -10],
    //     [20, 40, -25, -25, -30],


    //     [-40, 0, -10, -10, 20],
    //     [0, 40, -10, -10, -20],
    // ]
    let players = [];
    // const side = 'l'
    // const anotherSide = 'r'

    for (i = 0; i < A_team.length; i++) {
        let pl = A_team[i]
        let number = i + 2
        players.push(createAgent(teamName, false,
            pl[1], pl[0], pl[2], pl[3], pl[4], number, A_team[5]))
    }


    // for (const pl of B_team){
    //     players.push(createAgent(anotherTeamName, false, [low_ctrl, high_ctrl], 
    //         pl[1], pl[0], pl[2], pl[3], pl[4]))
    // }



    const createGoalie = (team) => {
        const goalie = createAgent(
            team,
            true,
            -50, 0, 0, // Позиция
            -50, 0,
            1,
            A_team[5]
        );
        goalie.taken.action = "return";
        goalie.taken.turnData = "ft0";
        return goalie;
    };

    let goalkeeper_A = createGoalie(teamName);
    // let goalkeeper_B = createGoalie(anotherTeamName);

    await Socket(goalkeeper_A, teamName, VERSION, true);
    await goalkeeper_A.socketSend('move', `${goalkeeper_A.start_x} ${goalkeeper_A.start_y}`);

    // await Socket(goalkeeper_B, anotherTeamName, VERSION, true);
    // await goalkeeper_B.socketSend('move', `${goalkeeper_B.start_x} ${goalkeeper_B.start_y}`);


    for (const player of players) {
        await Socket(player, player.teamName, VERSION);
        //console.log("move ", player.start_x, player.start_y);
        await player.socketSend('move', `${player.start_x} ${player.start_y}`);

    }
})();
