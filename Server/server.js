require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN ='https://tic-tac-toe-vert-sigma.vercel.app';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST']
  }
});

const allUsers = {};
const allRooms = [];

io.on('connection', (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true
  };

  socket.on('request_to_play', (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    let opponentPlayer;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      currentUser.playing = true;
      opponentPlayer.playing = true;

      allRooms.push({
        player1: opponentPlayer,
        player2: currentUser
      });

      currentUser.socket.emit('OpponentFound', {
        opponentName: opponentPlayer.playerName,
        playingAs: 'circle'
      });

      opponentPlayer.socket.emit('OpponentFound', {
        opponentName: currentUser.playerName,
        playingAs: 'cross'
      });

      currentUser.socket.on('playerMoveFromClient', (data) => {
        opponentPlayer.socket.emit('playerMoveFromServer', data);
      });

      opponentPlayer.socket.on('playerMoveFromClient', (data) => {
        currentUser.socket.emit('playerMoveFromServer', data);
      });
    } else {
      currentUser.socket.emit('OpponentNotFound');
    }
  });

  socket.on('disconnect', () => {
    const currentUser = allUsers[socket.id];
    if (currentUser) {
      currentUser.online = false;
      currentUser.playing = false;

      for (let index = 0; index < allRooms.length; index++) {
        const { player1, player2 } = allRooms[index];

        if (player1.socket.id === socket.id) {
          player2.socket.emit('opponentLeftMatch');
          break;
        }

        if (player2.socket.id === socket.id) {
          player1.socket.emit('opponentLeftMatch');
          break;
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
