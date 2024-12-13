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

const Quizzes = require('./Quizzes');

const lobbyQuizzes = {}; 

let users = {};

app.get('/quizzes', (req, res) => {
  res.json(Quizzes);
});

const lobbies = {};
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('restoreSession', ({ userID }) => {
    const user = users[userID];
    console.log(userID)
    console.log(user)
    
    if (user) {
      const lobby = lobbies[user.lobbyId]; 

      if (lobby) {
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
        id: socket.id,
        playerInfo,
        position: 1,
        turn: true,
        toAnswer: false,
      }],
      isPrivate,
      started,
      Dice: 0,
      showPopUp: false,
      SubmittedAnswer: "",
      currentResult: "",
    };
    lobbies[lobbyId] = lobbyData;
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
  
  socket.on('startGame', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started === true) {
      return callback({ success: false, message: 'Game already started' });
    }
  
    lobby.started = true;
  
  
    
    io.to(lobbyId).emit('updateLobby', lobby.players);
    callback({ success: true });
  });
  
  socket.on('getLobbyQuiz', ({ lobbyId }, callback) => {
    const quiz = lobbyQuizzes[lobbyId];
    
    if (!quiz) {
      return callback({ success: false, message: 'No quiz found for this lobby' });
    }
    
    callback({ success: true, question: quiz.Question,choices:quiz.Choices });
  });
  socket.on('checkOwner', ({ lobbyId ,userID}, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id === userID);
  
    if (!player) {
      return callback({ error: 'Player not found in lobby', owner: false });
    }
  
    return callback({ owner: !!player.playerInfo.owner });
  });
  socket.on('checkTurn', ({ lobbyId, userID }, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id === userID);
  
    if (!player) {
      return callback({ error: 'Player not found in lobby', owner: false });
    }
  
    return callback({ turn: !!player.turn });
  });
  
  
  socket.on('gameStarted', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
  
    return callback({ started: lobby.started });
  });
  socket.on('joinLobby', ({ playerInfo, lobbyId , userID}, callback) => {
    const lobby = lobbies[lobbyId];
  
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started) {
      return callback({ success: false, message: 'Game already started' });
    }
    const playerExists = lobby.players.some(player => player.id === userID);
    if (playerExists) {
      return callback({ success: false, message: 'Player already in lobby' });
    }
  
    if (lobby.isPrivate && lobby.players.length >= 8) {
      return callback({ success: false, message: 'Lobby is full' });
    }
  
    lobby.players.push({ id: socket.id, playerInfo, position: 1, turn: false, toAnswer: false });
    socket.join(lobbyId);
    io.to(lobbyId).emit('updateLobby', lobby.players);
    users[socket.id] = { 
      name: playerInfo.name, 
      lobbyId:lobbyId
    };
    callback({ success: true, players: lobby.players });
  });
  
  
  
  
socket.on('getLobbyPlayers', ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      socket.emit('initialLobbyPlayers', lobby.players); 
    }
  });

  socket.on('openQuiz', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ popUp:lobby.showPopUp });
    }
  });
  
  socket.on('getSubmittedAnswer', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ subAnsw:lobby.SubmittedAnswer });
    }
  });
  
  socket.on('getcurrentResult', ({ lobbyId },callback) => {
    const lobby = lobbies[lobbyId];
    
    if (lobby) {
      return callback({ res:lobby.currentResult });
    }
  });
  socket.on('submitAnswer', ({ lobbyId,choice,userID }) => {

    lobbies[lobbyId].SubmittedAnswer=choice;
    io.to(lobbyId).emit('multipleChoicesUpdate', lobbies[lobbyId].players);
    console.log("choice"+choice);
    console.log("SubmittedAnswer "+lobbies[lobbyId].SubmittedAnswer)
    const player= lobbies[lobbyId].players.find((p) => p.id === userID);
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
      io.to(lobbyId).emit('multipleChoicesUpdate', lobbies[lobbyId].players);
      lobbies[lobbyId].currentResult=result;
    }, 1000);
   
    setTimeout(() => {
      io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
      lobbies[lobbyId].showPopUp=false;
     
       
    }, 3500);
    setTimeout(() => {
    
      if (lobbyQuizzes[lobbyId].CorrectAnswer == choice) {
        switch (Grid[player.position]) {
          case "Training":
            movePlayerAtEnd(userID, lobbies[lobbyId].Dice, lobbyId, 1);
            break;
          case "Deal":
            movePlayerAtEnd(userID, 3, lobbyId, 1);
            break;
          case "MatchDay":
            goToNextTurn(userID, lobbyId);
            break;
          case "Final":
            movePlayerAtEnd(userID, 1, lobbyId, 1);
            break;
          case "DisciplinaryHearing":
            goToNextTurn(userID, lobbyId);
            break;
          default:
            goToNextTurn(userID, lobbyId);
            break;
        }
      } else {
        switch (Grid[player.position]) {
          case "Training":
            goToNextTurn(userID, lobbyId);
            break;
          case "Deal":
             movePlayerReverse(userID, 3, lobbyId, 1);
            break;
          case "MatchDay":
            movePlayerReverse(userID, lobbies[lobbyId].Dice, lobbyId, 1);
            break;
          case "Final":
            movePlayerReverse(userID, 8, lobbyId, 1);
            break;
          case "DisciplinaryHearing":
            movePlayerReverse(userID, player.position-1, lobbyId, 1);
            break;  
          default:
            goToNextTurn(userID, lobbyId);
            break;
      }
      
       
    }}, 5000);
  });

  function movePlayerReverse(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    const player = lobby.players.find((p) => p.id === playerId);
   
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
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
  }
  


  socket.on('rollDice', ({ lobbyId,userID }) => {
    if(!lobbies[lobbyId].players.find((p) => p.id === userID).turn)
      return;
    
    lobbies[lobbyId].SubmittedAnswer="";
    lobbies[lobbyId].players.find((p) => p.id === userID).turn = false;
    const min = 1;
    const max = 6;
    const diceRoll = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(diceRoll);
    lobbies[lobbyId].Dice = diceRoll;
    console.log(lobbies[lobbyId].Dice);
    
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
    setTimeout(() => {
      movePlayer(userID, diceRoll, lobbyId,1);
    }, 1500);
  });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

  function movePlayerAtEnd(playerId, diceRoll, lobbyId,first) {
    
    if(first>diceRoll)
      {
        
        goToNextTurn(playerId, lobbyId);
      return;
      }
    const lobby = lobbies[lobbyId];
    const player = lobby.players.find((p) => p.id === playerId);
    if(player.position>=90)
    {
      console.log(player.playerInfo.name + " has won the game ")
      return;
    }
    if (!player) {
      console.error('Player not found in lobby');
      return;
    }
  
    player.position += 1; 
    setTimeout(() => {
      
      movePlayerAtEnd(playerId, diceRoll, lobbyId, first+1);
    }, 250);
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
  }
  function movePlayer(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    const player = lobby.players.find((p) => p.id === playerId);
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
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
    return;
    }
    if (!player) {
      console.error('Player not found in lobby');
      return;
    }
  
    player.position += 1; 
    setTimeout(() => {
      movePlayer(playerId, diceRoll, lobbyId,first+1);
    }, 250);
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
  }
  
  function goToNextTurn(playerId, lobbyId) {
    const lobby = lobbies[lobbyId];
    lobby.currentResult=""
    console.log("next turn " )
    if (lobby) {
      const currentIndex = lobby.players.findIndex(player => player.id==playerId);
      
      if (currentIndex !== -1) {
        lobby.players[currentIndex].turn = false;
      }
  
      const nextIndex = (currentIndex + 1) % lobby.players.length;
      lobby.players[nextIndex].turn = true;
  
      io.to(lobbyId).emit('updateLobby', lobby.players);
  }
}
  socket.on('getDice', ({ lobbyId }, callback) => {
    if (lobbies[lobbyId]) {
      callback({ DiceRoll: lobbies[lobbyId].Dice });
    } else {
      callback({ error: 'Lobby not found' });
    }
  });

  socket.on('getToAnswer', ({ lobbyId,userID }, callback) => {
    
    const player = lobbies[lobbyId].players.find((player) => player.id === userID);
    if (lobbies[lobbyId]) {
      callback({ answer: player.toAnswer});
    } else {
      callback({ error: 'Lobby not found' });
    }
  });
  socket.on('disconnect', () => {
    const userID = Object.keys(users).find(id => users[id].socketID === socket.id);
    if (userID) {
      console.log(`Player ${userID} disconnected, saving data`);
      users[userID] = { socketID: socket.id, progress: users[userID].progress }; 
    }
  });

});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
