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

const Quizzes = require('./Quizzes');

const lobbyQuizzes = {}; 


app.get('/quizzes', (req, res) => {
  res.json(Quizzes);
});

const lobbies = {};
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createLobby', ({ playerInfo, isPrivate,started }, callback) => {
    const lobbyId = Math.random().toString(36).substring(2, 14); // Generate a random 12-character ID
    lobbies[lobbyId] = { players: [{ id: socket.id, playerInfo,position:1,turn : true,toAnswer:false }], isPrivate, started ,Dice:0 ,showPopUp:false,SubmittedAnswer:"",currentResult:"" };
    socket.join(lobbyId);
    console.log(`Lobby created: ${lobbyId}`);
    console.log(`Lobby started: ${lobbies[lobbyId].started}`);
    callback({ success: true, lobbyId, players: lobbies[lobbyId].players });
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
  socket.on('checkOwner', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id === socket.id);
  
    if (!player) {
      return callback({ error: 'Player not found in lobby', owner: false });
    }
  
    return callback({ owner: !!player.playerInfo.owner });
  });
  socket.on('checkTurn', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
    
    if (!lobby) {
      return callback({ error: 'Lobby not found', owner: false });
    }
  
    if (!Array.isArray(lobby.players)) {
      return callback({ error: 'Player information not found or invalid', owner: false });
    }
  
    const player = lobby.players.find(player => player.id === socket.id);
  
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
  socket.on('joinLobby', ({ playerInfo, lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
  
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started==true){
      return callback({ success: false, message: 'Game aldready started' });
    }
    const playerExists = lobby.players.some(player => player.id === socket.id);
    if (playerExists) {
      return callback({ success: false, message: 'Player already in lobby' });
    }
  
    if (lobby.isPrivate && lobby.players.length >= 8) {
      return callback({ success: false, message: 'Lobby is full' });
    }
  
    lobby.players.push({ id: socket.id, playerInfo,position:1 ,turn : false,toAnswer:false});
    socket.join(lobbyId);
    io.to(lobbyId).emit('updateLobby', lobby.players);
    callback({ success: true, players: lobby.players });
  });
  
  
  socket.on('leaveLobby', ({ lobbyId, playerId }, callback) => {
    const lobby = lobbies[lobbyId];
    ownerDisconnected = false;
    if (!lobby) {
      return ;
    }

    const playerIndex = lobby.players.findIndex((player) => player.id === playerId);
    
    if (playerIndex === -1) {
      return callback({ success: false, message: 'Player not found in lobby' });
    }

    if(lobby.players[playerIndex].playerInfo.owner){
      ownerDisconnected=true
    }
    lobby.players.splice(playerIndex, 1);
    io.to(lobbyId).emit('updateLobby', lobby.players); 

    if (lobby.players.length === 0) {
      delete lobbies[lobbyId];
    }else if(ownerDisconnected){
      lobbies[lobbyId].players[0].playerInfo.owner=true;
    }

    console.log(`Player ${playerId} left lobby ${lobbyId}`);
    
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
  socket.on('submitAnswer', ({ lobbyId,choice }) => {

    lobbies[lobbyId].SubmittedAnswer=choice;
    io.to(lobbyId).emit('multipleChoicesUpdate', lobbies[lobbyId].players);
    console.log("choice"+choice);
    console.log("SubmittedAnswer "+lobbies[lobbyId].SubmittedAnswer)
    const player= lobbies[lobbyId].players.find((p) => p.id === socket.id);
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
    
      if(lobbyQuizzes[lobbyId].CorrectAnswer==choice)
        {
          goToNextTurn(socket.id,lobbyId);
        }
        else{
          movePlayerReverse(socket.id,lobbies[lobbyId].Dice,lobbyId,1)
        }
       
    }, 5000);
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
  


  socket.on('rollDice', ({ lobbyId }) => {
    if(!lobbies[lobbyId].players.find((p) => p.id === socket.id).turn)
      return;
    
    lobbies[lobbyId].SubmittedAnswer="";
    lobbies[lobbyId].players.find((p) => p.id === socket.id).turn = false;
    const min = 1;
    const max = 6;
    const diceRoll = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(diceRoll);
    lobbies[lobbyId].Dice = diceRoll;
    console.log(lobbies[lobbyId].Dice);
    
    io.to(lobbyId).emit('updateLobby', lobbies[lobbyId].players);
    setTimeout(() => {
      movePlayer(socket.id, diceRoll, lobbyId,1);
    }, 1500);
  });

  function movePlayer(playerId, diceRoll, lobbyId,first) {
    
    const lobby = lobbies[lobbyId];
    const player = lobby.players.find((p) => p.id === playerId);
    if(player.position>=30)
    {
      console.log(player.playerInfo.name + " has won the game ")
      return;
    }
    if(first>diceRoll)
    {
      
    const randomQuiz = getRandomQuiz();
    lobbyQuizzes[lobbyId] = randomQuiz;
      //insert Challenge here instead of going to nextPlayer's Turn
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
      movePlayer(socket.id, diceRoll, lobbyId,first+1);
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

  socket.on('getToAnswer', ({ lobbyId }, callback) => {
    
    const player = lobbies[lobbyId].players.find((player) => player.id === socket.id);
    if (lobbies[lobbyId]) {
      callback({ answer: player.toAnswer});
    } else {
      callback({ error: 'Lobby not found' });
    }
  });
  socket.on('disconnect', () => {
    console.log(`Player ${socket.id} disconnected`);
    ownerDisconnected = false;
    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      const playerIndex = lobby.players.findIndex((player) => player.id === socket.id);

     
      if (playerIndex !== -1) {
        if(lobby.players[playerIndex].playerInfo.owner){
          ownerDisconnected=true
        }
        lobby.players.splice(playerIndex, 1);
        io.to(lobbyId).emit('updateLobby', lobby.players); 

        if (lobby.players.length === 0) {
          delete lobbies[lobbyId];
        }else if(ownerDisconnected){
          lobbies[lobbyId].players[0].playerInfo.owner=true;
        }
        
        console.log(`Player ${socket.id} disconnected and removed from lobby ${lobbyId}`);
        break; 
      }
    }
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
