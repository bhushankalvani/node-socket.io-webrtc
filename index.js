const express = require('express');
const app = express();
const cors = require('cors');

const SocketConnections = new Map(); /** @note Storing connections and userIds locally in memory to test. Ideally use a database like redis. */

app.use(
    cors({ 
        credentials: true, 
        origin: '*',
        allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Credentials, Access-Control-Allow-Origin, X-Requested-With, Access-Control-Allow-Headers, Authorization, content-md5',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
    })
);

const port = 3000;

// http connection
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  // path: '/io',
  cors: true,
  origins: '*:*',
  pingInterval: 5000,
  pingTimeout: 25000,
  transports: ['websocket', 'polling'],
});

io.on('connection', async (socket) => {
    console.log('new connection', socket.id);  
    // brodcasting socket.id
    socket.on('connect', (ack) => {
      ack('connected');
    });

    socket.on('register-user', (user, ack) => {
      /** 
       * @fixme Set peer connection id for userId in DB.
       * Currently use memory to store and return userId on screencast request.
       */
      // if(!SocketConnections.has(user.id)) {
      //   SocketConnections.set(user.id, socket);
      //   ack('user registered');
      // }
      SocketConnections.set(user.id, socket);
      ack('user registered');
    });
  
    socket.on('disconnect', async (userId) => {
      try {
        /** @fixme delete the socket and userId from the set in memory. */
        socket.disconnect();
        SocketConnections.delete(userId);
      } catch (disconnectError) {
        console.log('Socket disconnect error', disconnectError);
      }
    });

    // socket.on('screencast', (userId) => {
    //   /** @fixme send user's peer connection id based on userId. */
    //   /** @fixme Create individual rooms for each user stream connections for webrtc. */
    //   io.to(SocketConnections.get(userId)["id"]).emit('request-screencast', {user: userId, admin: SocketConnections.get('2').id}); // @fixme Find a way to only send admin connection.
    // });
    // io.to(socket.id).emit('screencast-request', async (userId) => {
    // console.log(`screencast requested for user id ${userId}, connection id is: `, SocketConnections.get(userId));
    // await io.to(socket.id).emit('screencast-request', { peerId });
  
    socket.on('request-screencast-cl', (peerReq) => {
      console.log('requesting for socket id FOR', peerReq['for']);
      io.to(SocketConnections.get(peerReq['for']).id).emit('request-screencast', peerReq);
    });

    socket.on('accepted-invite', (peerReq) => {
      console.log('accepted for user', peerReq['for']);
      io.to(SocketConnections.get(peerReq['for']).id).emit('screencast-accepted', peerReq);
    });

    socket.on('new-ice-candidate', (request) => {
      console.log('sharing new ice candidate for', request['for']);
      io.to(SocketConnections.get(request['for']).id).emit('ice-candidate-received', request);
    });

  });

  server.listen(port);
  server.addListener('listening', () => {
    console.log(`Socket server started on port ${port}`);
  });