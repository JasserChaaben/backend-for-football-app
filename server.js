const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'],
  },
});
const Grid = {
  1: "Beginning",
  2: "Deal",
  3: "Training",
  4: "Training",
  5: "MatchDay",
  6: "Training",
  7: "Deal",
  8: "Training",
  9: "Training",
  10: "MatchDay",
  11: "Training",
  12: "Deal",
  13: "Training",
  14: "Training",
  15: "MatchDay",
  16: "Training",
  17: "Deal",
  18: "Training",
  19: "Training",
  20: "MatchDay",
  21: "Training",
  22: "Deal",
  23: "Training",
  24: "Training",
  25: "MatchDay",
  26: "Training",
  27: "Deal",
  28: "Training",
  29: "Training",
  30: "MatchDay",
  31: "Training",
  32: "Deal",
  33: "Training",
  34: "Training",
  35: "MatchDay",
  36: "Training",
  37: "Deal",
  38: "Training",
  39: "Training",
  40: "MatchDay",
  41: "Training",
  42: "Deal",
  43: "Training",
  44: "DisciplinaryHearing",
  45: "MatchDay",
  46: "Training",
  47: "Deal",
  48: "Training",
  49: "Training",
  50: "MatchDay",
  51: "Training",
  52: "Deal",
  53: "Training",
  54: "Training",
  55: "MatchDay",
  56: "Training",
  57: "Deal",
  58: "Training",
  59: "Training",
  60: "MatchDay",
  61: "Training",
  62: "Deal",
  63: "Training",
  64: "Training",
  65: "MatchDay",
  66: "Training",
  67: "Deal",
  68: "Training",
  69: "Training",
  70: "MatchDay",
  71: "Training",
  72: "Deal",
  73: "Training",
  74: "Training",
  75: "MatchDay",
  76: "Training",
  77: "Deal",
  78: "Training",
  79: "Training",
  80: "MatchDay",
  81: "Training",
  82: "Deal",
  83: "Training",
  84: "Training",
  85: "MatchDay",
  86: "Training",
  87: "Deal",
  88: "DisciplinaryHearing",
  89: "Final",
  90: "Winner",
};
const Awards = {
  0: "All players go back to start position",
  1: "Move forward 3 spaces",
  2: "Move others 3 spaces backward",
  3: "Gain immunity from penalties for 1 turn",
  4: "Get your turn immediately",
  5: "Move to the space just before the leader",
  6: "All players move forward 2 spaces",
  7: "Steal 3 spaces from the player ahead of you",
  8: "Next dice roll, double your result",
};

const Quizzes = require('./Quizzes');

const lobbyQuizzes = {}; 

const lobbyAwards = {}; 

let users = {};

app.get('/quizzes', (req, res) => {
  res.json(Quizzes);
});

const lobbies = {};
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('restoreSession', ({ userID }) => {
    const user = users[userID];

    if (user) {
      const lobby = lobbies[user.lobbyId];

      if (lobby) {
        const playerIndex = lobby.players.findIndex(player => player.id.includes(userID));


        if (playerIndex != -1) { 
          
          lobby.players[playerIndex].id.push(socket.id);
          lobby.players[playerIndex].disconnected=false;
          if(lobby.playerToAward.id==userID)
          {
            lobby.playerToAward.id=socket.id;
          }
          users[socket.id] = { 
            name: lobby.players[playerIndex].playerInfo.name, 
            lobbyId:user.lobbyId
          };
          delete users[userID];
        }
        
        socket.emit('restoreData', { user, players: lobby.players });
        
      } else {
        socket.emit('restoreData', { user, players: [] });
      }
    } else {
      socket.emit('restoreData', null);
    }
  });
  // Handle user reconnect
  socket.on('connect', ({ userID }) => {
    if (players[userID]) {
      socket.emit('restoreData', players[userID]);  // Send the saved player data
    }
  });
  socket.on('createLobby', ({ playerInfo, isPrivate, started }, callback) => {
    const lobbyId = Math.random().toString(36).substring(2, 14);
    const lobbyData = {
      players: [{
        id: [socket.id],
        playerInfo,
        position: 1,
        turn: true,
        toAnswer: false,
        disconnected: false,
        timeToReconnect:0,
        imune:false,
        Double:false
      }],
      isPrivate,
      started,
      Dice: 0,
      showPopUp: false,
      showNumberPopUp:false,
      submittedNumberAnswers:[],
      numberSubmittedAnswers:0,
      SubmittedAnswer: "",
      currentResult: "",
      round:0,
      Timer:0,
      playerToAward:{id:null,name:null},
      showAwards:false,
      LastChoosedAward:"",
      timeToGetReward:false
    };
    lobbies[lobbyId] = lobbyData;
    console.log("lobby created with code : "+lobbyId)
    users[socket.id] = { 
      name: playerInfo.name, 
      lobbyId:lobbyId
    };
    socket.join(lobbyId);
    callback({
      success: true,
      lobbyId,
      players: lobbies[lobbyId].players,
    });
  });
  function getRandomQuiz() {
    const multipleChoiceKeys = Object.keys(Quizzes.MultipleChoices);
    const randomIndex = Math.floor(Math.random() * multipleChoiceKeys.length);
    const randomQuiz = Quizzes.MultipleChoices[multipleChoiceKeys[randomIndex]];
    return randomQuiz;
  }
  
  function getRandomNumberQuiz() {
    const DatesKeys = Object.keys(Quizzes.Dates);
    const randomIndex = Math.floor(Math.random() * DatesKeys.length);
    const randomQuiz = Quizzes.Dates[DatesKeys[randomIndex]];
    return randomQuiz;
  }
  function getRandomAwards() {
    
    const awardValues = Object.values(Awards); 
  const shuffledAwards = awardValues.sort(() => Math.random() - 0.5); 
  return shuffledAwards.slice(0, 4); 
  }
  
  socket.on('startGame', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started === true) {
      return callback({ success: false, message: 'Game already started' });
    }
  
    lobby.started = true;
  
  
    
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});;
    callback({ success: true });
  });
  
  socket.on('getLobbyQuiz', ({ lobbyId }, callback) => {
    const quiz = lobbyQuizzes[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!quiz) {
      return callback({ success: false, message: 'No quiz found for this lobby' });
    }
    
    callback({ success: true, question: quiz.Question,choices:quiz.Choices });
  });
  socket.on('checkOwner', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id.includes(socket.id));
  
    if (!player) {
      return callback({ error: 'Player not found in lobby', owner: false });
    }
  
    return callback({ owner: !!player.playerInfo.owner });
  });
  socket.on('checkTurn', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id.includes(socket.id));
  
    if (!player) {
      return callback({ error: 'Player not found in lobby', owner: false });
    }
  
    return callback({ turn: !!player.turn });
  });
  
  
  socket.on('gameStarted', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
  
    return callback({ started: lobby.started });
  });
  socket.on('joinLobby', ({ playerInfo, lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started) {
      return callback({ success: false, message: 'Game already started' });
    }
    const playerExists = lobby.players.some(player => player.id.includes(socket.id));
    if (playerExists) {
      return callback({ success: false, message: 'Player already in lobby' });
    }
  
    if (lobby.isPrivate && lobby.players.length >= 8) {
      return callback({ success: false, message: 'Lobby is full' });
    }
  
    lobby.players.push({ id: [socket.id], playerInfo, position: 1, turn: false, toAnswer: false , disconnected: false,timeToReconnect:0,imune:false});
    socket.join(lobbyId);
    users[socket.id] = { 
      name: playerInfo.name, 
      lobbyId:lobbyId
    };
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});;
    callback({ success: true, players: lobby.players });
  });
  
  
  
  
socket.on('getLobbyPlayers', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (lobby) {
      lobbies[lobbyId].players.forEach(player => {
        player.id.forEach(socketId => {
          io.to(socketId).emit('initialLobbyPlayers', lobby.players);
        });
      });
    }
  });

  socket.on('openQuiz', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ popUp:lobby.showPopUp });
    }
  });
  
  socket.on('openNumberQuiz', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ popUp:lobby.showNumberPopUp });
    }
  });
  socket.on('getSubmittedAnswer', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ subAnsw:lobby.SubmittedAnswer });
    }
  });
  
  socket.on('getPlayerAwarded', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ playerAwarded:lobby.playerToAward });
    }
  });
  socket.on('getMyAward', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
  
    if (lobby) {
      return callback({ res:lobby.playerToAward.id==socket.id&&lobby.timeToGetReward });
    }
  });
  
  socket.on('getcurrentResult', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ res:lobby.currentResult });
    }
  });
  socket.on('submitNumberAnswer', ({ lobbyId,choice }) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    
    lobbies[lobbyId].submittedNumberAnswers[lobbies[lobbyId].numberSubmittedAnswers]={id:socket.id ,name : lobbies[lobbyId].players.find(player => player.id.includes(socket.id)).playerInfo.name.toString(),answer : choice};
    lobbies[lobbyId].numberSubmittedAnswers++; 
    lobbies[lobbyId].players.find(player => player.id.includes(socket.id)).toAnswer=false;
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('numberChoiceUpdate',  lobbies[lobbyId].players);
  });
  

});

if(lobbies[lobbyId].numberSubmittedAnswers>=lobbies[lobbyId].players.length){
  setTimeout(()=>{EvaluateAnswers(lobbyId)},1000)
}
})
function EvaluateAnswers(lobbyId){
  if (!lobbies[lobbyId]) {
    delete lobbies[lobbyId];
    return;
  }
  
  if (!lobbies[lobbyId].players) {
    delete lobbies[lobbyId];
    return;
  }
  
  let array =  lobbies[lobbyId].submittedNumberAnswers;
  let correctAns = lobbyQuizzes[lobbyId].CorrectAnswer;
  const Winner=determineWinner(array, correctAns);

  lobbies[lobbyId].currentResult= "Correct Answer is "+correctAns+"\n"+Winner.name+" Wins this round" ;

  lobbies[lobbyId].players.forEach(player => {
    player.id.forEach(socketId => {
      io.to(socketId).emit('numberChoiceUpdate',  lobbies[lobbyId].players);
    });
    
  
  });
  
  setTimeout(()=>{AwardThePlayer(lobbyId,Winner.id)},1500)
}
function AwardThePlayer(lobbyId,playerId){
  if (!lobbies[lobbyId]) {
    delete lobbies[lobbyId];
    return;
  }
  
  if (!lobbies[lobbyId].players) {
    delete lobbies[lobbyId];
    return;
  }
  lobbyAwards[lobbyId]=getRandomAwards();
  lobbies[lobbyId].showNumberPopUp=false;
  lobbies[lobbyId].timeToGetReward=true;
  lobbies[lobbyId].playerToAward.id=playerId;
  lobbies[lobbyId].playerToAward.name=lobbies[lobbyId].players.find((p)=>p.id==playerId).playerInfo;
  lobbies[lobbyId].showAwards=true;
  lobbies[lobbyId].players.forEach(player => {
    player.id.forEach(socketId => {
      io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
    });
  });
  
}

socket.on('getAwards', ({ lobbyId },callback) => {
  const lobby = lobbies[lobbyId];
  if (lobby) {
    return callback({ awards: lobbyAwards[lobbyId] });
  }
});
socket.on('getShowAwards', ({ lobbyId },callback) => {
  const lobby = lobbies[lobbyId];
  if (lobby) {
   
    return callback({ showAwards: lobby.showAwards });
  }
});
function determineWinner(array, correctAns) {
  let winnerId = null;
  let closestDifference = Infinity;

  for (let entry of array) {
      const difference = Math.abs(entry.answer - correctAns);

      if (difference < closestDifference) {
          closestDifference = difference;
          winnerId = entry;
      }
  }

  return winnerId;
}


socket.on('getNumberSubmittedAnswer', ({ lobbyId },callback) => {
  const lobby = lobbies[lobbyId];
  let array = [];
  if (lobby) {
   
    return callback({ subAnsw: lobby.submittedNumberAnswers });
  }
});
  
  socket.on('submitAnswer', ({ lobbyId,choice }) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    lobbies[lobbyId].SubmittedAnswer=choice;
    
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('multipleChoicesUpdate',  lobbies[lobbyId].players);
  });
});
    const player= lobbies[lobbyId].players.find((p) => p.id.includes(socket.id));
    let result ="";
    if(!player.toAnswer)
      return;
    player.toAnswer=false;
    if(lobbyQuizzes[lobbyId].CorrectAnswer==choice)
      {
        result="Correct Answer";
      }
      else{
        result="Wrong Answer"
      }
    setTimeout(() => {
      lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('multipleChoicesUpdate',  lobbies[lobbyId].players);
  });
});
      lobbies[lobbyId].currentResult=result;
    }, 1000);
   
    setTimeout(() => {
      lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
      lobbies[lobbyId].showPopUp=false;
     
       
    }, 3500);
    setTimeout(() => {
    
      if (lobbyQuizzes[lobbyId].CorrectAnswer == choice) {
        switch (Grid[player.position]) {
          case "Training":
            movePlayerAtEnd(socket.id, lobbies[lobbyId].Dice, lobbyId, 1);
            break;
          case "Deal":
            movePlayerAtEnd(socket.id, 3, lobbyId, 1);
            break;
          case "MatchDay":
            goToNextTurn(socket.id, lobbyId);
            break;
          case "Final":
            movePlayerAtEnd(socket.id, 1, lobbyId, 1);
            break;
          case "DisciplinaryHearing":
            goToNextTurn(socket.id, lobbyId);
            break;
          default:
            goToNextTurn(socket.id, lobbyId);
            break;
        }
      } else {
        switch (Grid[player.position]) {
          case "Training":
            goToNextTurn(socket.id, lobbyId);
            break;
          case "Deal":
             movePlayerReverse(socket.id, 3, lobbyId, 1);
            break;
          case "MatchDay":
            movePlayerReverse(socket.id, lobbies[lobbyId].Dice, lobbyId, 1);
            break;
          case "Final":
            movePlayerReverse(socket.id, 8, lobbyId, 1);
            break;
          case "DisciplinaryHearing":
            movePlayerReverse(socket.id, player.position-1, lobbyId, 1);
            break;  
          default:
            goToNextTurn(socket.id, lobbyId);
            break;
      }
      
       
    }}, 5000);
  });
  socket.on('submitAward', ({ lobbyId,choice }) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    
    lobbies[lobbyId].timeToGetReward=false;
    lobbies[lobbyId].LastChoosedAward=choice;
    lobbies[lobbyId].players.forEach(player => {
      player.id.forEach(socketId => {
        io.to(socketId).emit('awardsUpdate', lobbies[lobbyId].players);
      });
    });


    setTimeout(()=>{ ActivateReward(socket.id,lobbyId,choice) },2000)
  });

  function ActivateReward(playerId,lobbyId,choice){
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }

    lobbies[lobbyId].round=-1;

    
    
    lobbies[lobbyId].submittedNumberAnswers=[];
    lobbies[lobbyId].numberSubmittedAnswers=0;

    lobbies[lobbyId].currentResult=""
    lobbies[lobbyId].showAwards=false;

    switch (choice) {
      case "All players go back to start position":
        lobbies[lobbyId].players.forEach((p) => {
          const lastId = p.id[p.id.length - 1];
          movePlayerReverseWithoutNextTurn(lastId, p.position - 1, lobbyId, 1);
        });
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 5000);
        break;
    
      case "Move forward 3 spaces":
        movePlayerAtEndWithoutNextTurn(playerId, 3, lobbyId, 1);
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 3000);
        break;
    
      case "Move others 3 spaces backward":
        lobbies[lobbyId].players.forEach((p) => {
          
          const lastId = p.id[p.id.length - 1];
          if (lastId !== playerId) {
            movePlayerReverseWithoutNextTurn(lastId, 3, lobbyId, 1);
          }
        });
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 3000);
        break;
    
      case "Gain immunity from penalties for 1 turn":
        const player = lobbies[lobbyId].players.find((p) => p.id.includes(playerId));
        if (player) player.imune = true;
        goToNextTurn(playerId, lobbyId);
        break;
    
      case "Get your turn immediately":
        lobbies[lobbyId].players.forEach((p) => (p.turn = false)); // Reset all turns
        const currentPlayer = lobbies[lobbyId].players.find((p) => p.id.includes(playerId));
        if (currentPlayer) currentPlayer.turn = true; // Set current player’s turn
        break;
    
      case "Move to the space just before the leader":
        const leaderPosition = getLeaderPos(lobbyId);
        const currentPos = lobbies[lobbyId].players.find((p) => p.id.includes(playerId))?.position || 1;
        movePlayerAtEndWithoutNextTurn(playerId, leaderPosition - currentPos - 1, lobbyId, 1);
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 5000);
        break;
    
      case "All players move forward 2 spaces":
        lobbies[lobbyId].players.forEach((p) => 
        {
          const lastId = p.id[p.id.length - 1];
          movePlayerAtEndWithoutNextTurn(lastId, 2, lobbyId, 1)}
        );
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 2000);
        break;
    
      case "Steal 3 spaces from the player ahead of you":
        const nextPlayerId = getNextId(lobbyId, playerId);
        if (nextPlayerId) {
          movePlayerReverseWithoutNextTurn(nextPlayerId, 3, lobbyId, 1);
          movePlayerAtEndWithoutNextTurn(playerId, 3, lobbyId, 1);
        }
        setTimeout(() => {
          goToNextTurn(playerId, lobbyId);
        }, 3000);
        break;
    
      case "Next dice roll, double your result":
        const dicePlayer = lobbies[lobbyId].players.find((p) => p.id.includes(playerId));
        if (dicePlayer) dicePlayer.Double = true;
        goToNextTurn(playerId, lobbyId);
        break;
    
      default:
        break;
    }
    
    lobbies[lobbyId].players.forEach(player => {
      player.id.forEach(socketId => {
        io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
      });
    });
    
  }
  function getLeaderPos(lobbyId){
    if (!lobbies[lobbyId] || !lobbies[lobbyId].players) {
      return null; 
    }
  
    const players = lobbies[lobbyId].players;
    let leaderPosition = -Infinity;
  
    for (const player of players) {
      if (player.position > leaderPosition) {
        leaderPosition = player.position;
      }
    }
  
    return leaderPosition;
  }

  function getNextId(lobbyId, currentPlayerId) {
    if (!lobbies[lobbyId] || !lobbies[lobbyId].players) {
      return null; 
    }
  
    const players = lobbies[lobbyId].players;
  
    const currentPlayer = players.find(player => player.id.includes(currentPlayerId));
    if (!currentPlayer) {
      return null; 
    }
    const currentPosition = currentPlayer.position;
  
    let nextPlayerId = null;
    let nextPlayerPosition = Infinity;
  
    for (const player of players) {
      if (
        !player.id.includes(currentPlayerId) && 
        player.position >= currentPosition && 
        player.position < nextPlayerPosition 
      ) {
        nextPlayerId = player.id[player.id.length - 1]; 
        nextPlayerPosition = player.position;
      }
    }
  
    return nextPlayerId;
  }
  
  
  function movePlayerReverseWithoutNextTurn(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    const player = lobby.players.find((player) => player.id.includes(playerId));
   
    if(first>diceRoll||player.position==1)
    {
    return;
    }
    if (!player) {
      console.error('Player not found in lobby');
      return;
    }

    player.position -= 1; 
    setTimeout(() => {
      movePlayerReverseWithoutNextTurn(playerId, diceRoll, lobbyId,first+1);
    }, 250);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
  }
  


  function movePlayerReverse(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    const player = lobby.players.find((player) => player.id.includes(playerId));
   
    if(first>diceRoll||player.position==1)
    {
      goToNextTurn(playerId,lobbyId);
    return;
    }
    if (!player) {
      console.error('Player not found in lobby');
      return;
    }

    player.position -= 1; 
    setTimeout(() => {
      movePlayerReverse(playerId, diceRoll, lobbyId,first+1);
    }, 250);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
  }
  


  socket.on('rollDice', ({ lobbyId }) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if(!lobbies[lobbyId].players.find((p) => p.id.includes(socket.id)).turn)
      return;
    
    lobbies[lobbyId].SubmittedAnswer="";
    lobbies[lobbyId].players.find((p) => p.id.includes(socket.id)).turn = false;
    const min = 1;
    const max = 6;
    const diceRoll = Math.floor(Math.random() * (max - min + 1)) + min;
    lobbies[lobbyId].Dice = diceRoll;
    if( lobbies[lobbyId].players.find((p) => p.id.includes(socket.id)).Double)
      diceRoll=diceRoll*2;
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
    setTimeout(() => {
      movePlayer(socket.id, diceRoll, lobbyId,1);
    }, 1500);
  });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

function movePlayerAtEndWithoutNextTurn(playerId, diceRoll, lobbyId,first) {
  if (!lobbies[lobbyId]) {
    delete lobbies[lobbyId];
    return;
  }
  
  if (!lobbies[lobbyId].players) {
    delete lobbies[lobbyId];
    return;
  }
  if(first>diceRoll)
    {
    return;
    }
  const lobby = lobbies[lobbyId];
  const player = lobby.players.find((p) => p.id.includes(playerId));
  if(player.position>=90)
  {
    return;
  }
  if (!player) {
    return;
  }

  player.position += 1; 
  setTimeout(() => {
    
    movePlayerAtEndWithoutNextTurn(socket.id, diceRoll, lobbyId, first+1);
  }, 250);
  lobbies[lobbyId].players.forEach(player => {
player.id.forEach(socketId => {
  io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
});
});
}



  function movePlayerAtEnd(playerId, diceRoll, lobbyId,first) {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if(first>diceRoll)
      {
        
        goToNextTurn(socket.id, lobbyId);
      return;
      }
    const lobby = lobbies[lobbyId];
    const player = lobby.players.find((p) => p.id.includes(playerId));
    if(player.position>=90)
    {
      return;
    }
    if (!player) {
      return;
    }
  
    player.position += 1; 
    setTimeout(() => {
      
      movePlayerAtEnd(socket.id, diceRoll, lobbyId, first+1);
    }, 250);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
  }
  function movePlayer(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    const player = lobby.players.find((p) => p.id.includes(playerId));
    if(player.position>=90)
    {
      console.log(player.playerInfo.name + " has won the game ")
      return;
    }
    if(first>diceRoll)
    {
    const randomQuiz = getRandomQuiz();

    shuffleArray(randomQuiz.Choices);

    lobbyQuizzes[lobbyId] = randomQuiz;
      
    lobby.showPopUp=true;
    player.toAnswer=true;
    lobby.Timer=10;
    setTimeout(()=>{Countdown(lobbyId,playerId) ;
        
      lobbies[lobbyId].players.forEach(player => {
      player.id.forEach(socketId => {
      io.to(socketId).emit('multipleChoicesUpdate',  lobbies[lobbyId].players);
    })});},1000);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
    return;
    }
    if (!player) {
      console.error('Player not found in lobby');
      return;
    }
  
    player.position += 1; 
    setTimeout(() => {
      movePlayer(socket.id, diceRoll, lobbyId,first+1);
    }, 250);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
  }
  function Countdown(lobbyId,playerId){
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobby.players) {
      delete lobbies[lobbyId];
      return;
    }
    const player = lobby.players.find((p) => p.id.includes(playerId));
    if(!player.toAnswer){
      return;
    }
    if(lobby.Timer<=0)
    {
      const player= lobbies[lobbyId].players.find((p) => p.id.includes(playerId));
      let result ="";
      let choice ="";
      if(!player.toAnswer)
        return;
      player.toAnswer=false;
      if(lobbyQuizzes[lobbyId].CorrectAnswer==choice)
        {
          result="Correct Answer";
        }
        else{
          result="Wrong Answer"
        }
      setTimeout(() => {
        lobbies[lobbyId].players.forEach(player => {
    player.id.forEach(socketId => {
      io.to(socketId).emit('multipleChoicesUpdate',  lobbies[lobbyId].players);
    });
  });
        lobbies[lobbyId].currentResult=result;
      }, 1000);
     
      setTimeout(() => {
        lobbies[lobbyId].players.forEach(player => {
    player.id.forEach(socketId => {
      io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
    });
  });
        lobbies[lobbyId].showPopUp=false;
       
         
      }, 3500);
      setTimeout(() => {
      
        if (lobbyQuizzes[lobbyId].CorrectAnswer == choice) {
          switch (Grid[player.position]) {
            case "Training":
              movePlayerAtEnd(socket.id, lobbies[lobbyId].Dice, lobbyId, 1);
              break;
            case "Deal":
              movePlayerAtEnd(socket.id, 3, lobbyId, 1);
              break;
            case "MatchDay":
              goToNextTurn(socket.id, lobbyId);
              break;
            case "Final":
              movePlayerAtEnd(socket.id, 1, lobbyId, 1);
              break;
            case "DisciplinaryHearing":
              goToNextTurn(socket.id, lobbyId);
              break;
            default:
              goToNextTurn(socket.id, lobbyId);
              break;
          }
        } else {
          switch (Grid[player.position]) {
            case "Training":
              goToNextTurn(socket.id, lobbyId);
              break;
            case "Deal":
               movePlayerReverse(socket.id, 3, lobbyId, 1);
              break;
            case "MatchDay":
              movePlayerReverse(socket.id, lobbies[lobbyId].Dice, lobbyId, 1);
              break;
            case "Final":
              movePlayerReverse(socket.id, 8, lobbyId, 1);
              break;
            case "DisciplinaryHearing":
              movePlayerReverse(socket.id, player.position-1, lobbyId, 1);
              break;  
            default:
              goToNextTurn(socket.id, lobbyId);
              break;
        }
        
         
      }}, 5000);
  
    }
    if(lobby.Timer>0)
    {
      lobby.Timer--;
      setTimeout(()=>{Countdown(lobbyId,playerId) ;
        
        lobbies[lobbyId].players.forEach(player => {
        player.id.forEach(socketId => {
        io.to(socketId).emit('multipleChoicesUpdate',  lobbies[lobbyId].players);
      })});},1000);
      return;
    }
  }
  function goToNextTurn(playerId, lobbyId) {
    const lobby = lobbies[lobbyId];
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    if (!lobby) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobby.players) {
      delete lobbies[lobbyId];
      return;
    }

    lobby.currentResult=""
    if (lobby) {
      lobby.round++;
    if(lobby.round>=lobby.players.length){
        
    const randomQuiz = getRandomNumberQuiz();
    lobbyQuizzes[lobbyId] = randomQuiz;
      
    lobby.showNumberPopUp=true;
    lobbies[lobbyId].players.forEach(player=>player.toAnswer=true);
    lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  })});
  return;
      }
      const currentIndex = lobby.players.findIndex(player => player.id.includes(playerId));
      
      
      if (currentIndex !== -1) {
        lobby.players[currentIndex].turn = false;
      }
  
      const nextIndex = (currentIndex + 1) % lobby.players.length;
      lobby.players[nextIndex].turn = true;
  
      lobbies[lobbyId].players.forEach(player => {
  player.id.forEach(socketId => {
    io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
  });
});
  }
}
  socket.on('getDice', ({ lobbyId }, callback) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (lobbies[lobbyId]) {
      callback({ DiceRoll: lobbies[lobbyId].Dice });
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  socket.on('getAwardChosen', ({ lobbyId }, callback) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (lobbies[lobbyId]) {
      callback({ chosen: lobbies[lobbyId].LastChoosedAward });
    } 
  });
  socket.on('getTimer', ({ lobbyId }, callback) => {
    if (!lobbies[lobbyId]) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobbies[lobbyId].players) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (lobbies[lobbyId]) {
      callback({ Timer : lobbies[lobbyId].Timer });
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  socket.on('getToAnswer', ({ lobbyId }, callback) => {
    
    const player = lobbies[lobbyId].players.find((player) => player.id.includes(socket.id));
    if (lobbies[lobbyId]) {
      callback({ answer: player.toAnswer});
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  socket.on('leaveLobby', ({ lobbyId, playerId }, callback) => {
    disconnectForGood(lobbyId,playerId)
  });

  const disconnectForGood=(lobbyId,playerId)=>{
    
    const lobby = lobbies[lobbyId];
    if (!lobby) {
      delete lobbies[lobbyId];
      return;
    }
    
    if (!lobby.players) {
      delete lobbies[lobbyId];
      return;
    }
    const playerIndex = lobby.players.findIndex((player) => player.id.includes(playerId));
    if (playerIndex !== -1) {
      if(lobby.players[playerIndex].playerInfo.owner){
        ownerDisconnected=true
      }
      if(lobby.players[playerIndex].turn||lobby.players[playerIndex].toAnswer){
        lobby.showPopUp=false;
        goToNextTurn(playerId, lobbyId);
      }
      lobby.players.splice(playerIndex, 1);
      lobbies[lobbyId].players.forEach(player => {
player.id.forEach(socketId => {
  io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
});
});; 
      if (lobby.players.length === 0) {
        delete lobbies[lobbyId];
      }else if(ownerDisconnected){
        lobbies[lobbyId].players[0].playerInfo.owner=true;
      }
      
      console.log(`Player ${socket.id} disconnected and removed from lobby ${lobbyId}`);
  }
  }
  const CheckForDisconnection=(lobbyId,playerId,time)=>{
   
    const lobby = lobbies[lobbyId];
    const playerIndex = lobby.players.findIndex((player) => player.id.includes(socket.id));
    if(time<=0)
      {
        disconnectForGood(lobbyId,playerId);
        return;
      }
    if(!lobby.players[playerIndex].disconnected)
    {
      return;
    }
    if (!lobby.players[playerIndex]){
      return;
    }
    setTimeout(() => {
      
    if (!lobby.players[playerIndex]){
      return;
    }
      lobby.players[playerIndex].timeToReconnect=time-1;
      lobbies[lobbyId].players.forEach(player => {
        player.id.forEach(socketId => {
          io.to(socketId).emit('updateLobby', lobbies[lobbyId].players);
        });
      });;
      CheckForDisconnection(lobbyId,playerId,time-1);
    }, 1000);
  }
  socket.on('disconnect', () => {
    ownerDisconnected = false;
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
    const playerIndex = lobby.players.findIndex((player) => player.id.includes(socket.id));
    if(playerIndex !== -1){
      
    console.log(`Player ${socket.id} disconnected and waiting for reconnection`);
      lobby.players[playerIndex].disconnected=true;
      CheckForDisconnection(lobbyId,socket.id,60);
      return;
    }
    
    console.log(`Player ${socket.id} disconnected`);
  }
   });


});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
