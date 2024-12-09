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

const lobbies = {};
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createLobby', ({ playerInfo, isPrivate,started }, callback) => {
    const lobbyId = Math.random().toString(36).substring(2, 14); // Generate a random 12-character ID
    lobbies[lobbyId] = { players: [{ id: socket.id, playerInfo,position:1,turn : true,toAnswer:false }], isPrivate, started ,Dice:0};
    socket.join(lobbyId);
    console.log(`Lobby created: ${lobbyId}`);
    console.log(`Lobby started: ${lobbies[lobbyId].started}`);
    callback({ success: true, lobbyId, players: lobbies[lobbyId].players });
  });
  socket.on('startGame', ({ lobbyId }, callback) => {
    const lobby = lobbies[lobbyId];
  
    console.log(`Lobby started: ${lobbies[lobbyId].started}`);
    if (!lobby) {
      return callback({ success: false, message: 'Lobby not found' });
    }
    if (lobby.started==true){
      return callback({ success: false, message: 'Game aldready started' });
    }
    lobby.started=true;
    console.log(`Lobby started: ${lobbies[lobbyId].started}`);
    io.to(lobbyId).emit('updateLobby', lobby.players);
    callback({ success : true });
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

  socket.on('rollDice', ({ lobbyId }) => {
    if(!lobbies[lobbyId].players.find((p) => p.id === socket.id).turn)
      return;
    
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
      //insert Challenge here instead of going to nextPlayer's Turn
    goToNextTurn(playerId, lobbyId);
    
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
