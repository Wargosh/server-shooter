const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const passport = require('passport');
const errorhandler = require('errorhandler');
const multer = require('multer');
const helpers = require('./helpers');

// servidor socket.io
const SocketIO = require('socket.io'); // realiza una comunicacion bidireccional (Cliente - Servidor).
const shortid = require('shortid'); // genera ids aleatorios cortos

// modelos
const Player = require('./models/Player');
const Chat = require('./models/Chat');
const Friend = require('./models/Friend');

//Inicializaciones
const app = express();
require('./database');
require('./config/passport');

// Seccion de configuración
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    partialsDir: path.join(app.get('views'), 'partials'),
    helpers: require('./helpers'),
    extname: '.hbs'
}));
app.set('view engine', '.hbs');

// Seccion Middlewares (funciones que seran ejecutadas antes que lleguen al servidor o rutas)
app.use(multer({ dest: path.join(__dirname, '/public/upload/temp') }).single('image'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
    secret: 'mysecrepapp',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Variables Globales
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;

    next();
});

// Routes
app.use(require('./routes/players'));
app.use(require('./routes/chats'));
app.use(require('./routes/index'));

// Archivos estaticos
app.use(express.static(path.join(__dirname, 'public')));

// errorhandlers
if ('development' === app.get('env')) {
    app.use(errorhandler);
}

// Oyente de Servidor
const server = app.listen(app.get('port'), () => {
    console.log('Server on port ', app.get('port'));
});

const io = SocketIO(server);

var playersCount = 0;
var boxesCount = 0;
var roomsCount = 0;
var players = [];
var boxes = [];
var items = [];
var rooms = [];

// generar cajas en posiciones aleatorias
if (boxesCount == 0) {
    for (let i = 0; i < 20; i++) {
        const idBox = shortid.generate();
        var box = {
            id: idBox,
            posX: helpers.getRandomArbitrary(-50, 50),
            posY: helpers.getRandomArbitrary(-28, 28)
        }
        boxes[idBox] = box;
        boxesCount++;
    }
}

// OYENTE para clientes que entren al servidor
io.on('connection', (socket) => {
    console.log('new connection', socket.id);

    playersCount++;
    var roomGame = "";

    var thisPlayerId = shortid.generate();

    var player = {
        id: thisPlayerId,
        username: "none",
        posX: "0.0",
        posY: "0.0",
        rotTank: "0.0",
        rotCannon: "0.0",
        isRun: false,
        shield: false,
        damagex2: false,
        bulletX: "0.0",
        bulletY: "0.0",
        bulletRot: "0.0",
        cannon: "",
        buffDamage: "",
        index: "",
        roomGame: ""
    }

    players[thisPlayerId] = player;
    console.log("player", player);

    socket.emit('connectionEstabilished', { id: thisPlayerId });

    // actualizar a los demas y a ti mismo del total de jugadores
    socket.broadcast.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });
    socket.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });

    // el jugador 'entra' a una sala de juego... aleatoria
    socket.on('room:game', function() {
        var banRoom = false;
        if (roomsCount > 0) { // si existen salas creadas
            for (var r in rooms) {
                const auxRoom = io.sockets.adapter.rooms[r];
                if (auxRoom) { // evitar error undefined...
                    if (auxRoom.length < 2) { // establesco un limite de usuarios por sala
                        banRoom = true;
                        socket.join(r); // unirse a esta sala
                        roomsCount++;
                        rooms[r] = { id_room: r };
                        roomGame = r;
                        players[thisPlayerId].roomGame = roomGame;

                        // mantener al cliente en cola, hasta cumplir la condición
                        const statusRoom = io.sockets.adapter.rooms[r];
                        if (statusRoom.length == 2) {
                            socket.in(roomGame).broadcast.emit('game:start', { message: 'OK' });
                            socket.emit('game:start', { message: 'OK' });
                        }
                        break;
                    }
                }
            }
        }

        if (!banRoom) { // si no encontro una sala disponible
            // crea una nueva sala
            const idRoom = shortid.generate();
            var room = {
                id_room: idRoom
            }
            rooms[idRoom] = room;
            roomGame = idRoom;

            socket.join(idRoom); // unirse a esta sala
            roomsCount++;
        }
        console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has joined to the room: " + roomGame);
    });

    // el jugador sale de una sala de juego...
    socket.on('room:leave', function() {
        if (roomGame != "") {
            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has left the room: " + roomGame);

            const auxRoom = io.sockets.adapter.rooms[roomGame];

            if (auxRoom.length <= 1) { // si es el ultimo jugador en la sala
                roomsCount--; // reducir el numero de salas
                delete rooms[roomGame];
            } else {
                // quitar el prefab del juego a los demas clientes de esa sala
                socket.in(roomGame).broadcast.emit("PlayerLeavedGame", { id: thisPlayerId });
            }

            socket.leave(roomGame); // salir de la sala

            roomGame = "";
            players[thisPlayerId].roomGame = "";
        }
    });

    /*socket.on('leaderboard', async function () {
        const bestPlayers = await new Player.find().sort({ rank: 'desc' }).limit(5);
        if (bestPlayers) {
            socket.emit('leaderboard', {
                ranks: bestPlayers
            });
        }
    });*/

    // el jugador acaba de iniciar sesion
    socket.on('player:online', async function(data) {
        const p = await Player.findById(data.id);
        if (p) {
            p.status_player = "online";
            await p.save();
        }
        players[thisPlayerId].username = data.username;

        socket.broadcast.emit('player:online', { id: thisPlayerId, user: data.username });
    });

    socket.on('spawn', async function(data) {
        const p = await Player.findById(data.id);
        p.status_player = "in a game";
        await p.save();

        // Envia para todos los otros jugadores.
        socket.in(roomGame).broadcast.emit('spawn', { id: thisPlayerId, user: data.username });

        // Envia Solo para el jugador actual
        for (var playerId in players) {
            if (playerId == thisPlayerId) continue;

            if (players[playerId].roomGame == roomGame)
                socket.emit('spawn', { id: players[playerId].id, user: players[playerId].username });
        }

        // podria enviarse las cajas mediante una room...
        for (var b in boxes) {
            socket.emit('spawnBox', boxes[b]);
        }
    });

    socket.on('spawnBox', function(data) {
        for (var b in boxes) {
            if (b == data.id) {
                delete boxes[b];
                boxesCount--;

                socket.in(roomGame).broadcast.emit('removeBox', { id: data.id });

                const idBox = shortid.generate();

                var box = {
                    id: idBox,
                    posX: helpers.getRandomArbitrary(-50, 50),
                    posY: helpers.getRandomArbitrary(-28, 28)
                }
                boxes[idBox] = box;
                boxesCount++;

                console.log("generando item random");
                setTimeout(function() {
                    socket.in(roomGame).broadcast.emit('spawnBox', box);
                    socket.emit('spawnBox', box);
                }, 10000);

                // generar item random
                var item = { id: data.id }
                item = data;
                item.id = data.id;
                item.item = helpers.getRandomInt(0, data.total);
                items[data.id] = item;

                socket.in(roomGame).broadcast.emit('spawnRandomItem', item);
                socket.emit('spawnRandomItem', item);
                console.log("item: ", item);
                break;
            }
        }
    });

    socket.on('destroyItem', function(data) {
        for (var i in items) {
            if (i == data.id) {
                delete items[data.id];

                socket.in(roomGame).broadcast.emit('destroyItem', { id: data.id });
                break;
            }
        }
    });

    // actualiza la posicion y rotacion (y demas info) del jugador hacia los demás jugadores
    socket.on('updatePosition', function(data) {
        //console.log('update position: ', data);
        data.id = thisPlayerId;
        player = data;
        socket.in(roomGame).broadcast.emit('updatePosition', data);
    });

    // actualiza si el jugador ha recibido o perdido salud
    socket.on('player:health', function(data) {
        data.id = thisPlayerId;
        player = data;
        socket.in(roomGame).broadcast.emit('player:health', data);
    });

    // actualiza si el jugador dispara
    socket.on('player:shoot', function(data) {
        data.id = thisPlayerId;
        player = data;
        socket.in(roomGame).broadcast.emit('player:shoot', data);
        socket.emit('player:shoot', data);
    });

    // notificar a los demas jugadores del jugador que ha muerto
    socket.on('player:dead', function(data) {
        console.log("info kill = ", data);
        socket.in(roomGame).broadcast.emit('player:dead', data);
    });

    // habilitar el prefab del jugador en los otros clientes
    socket.on('player:respawn', function(data) {
        socket.in(roomGame).broadcast.emit('player:respawn', data);
    });

    // Cuando un jugador se desconecta
    socket.on('disconnect', async function() {
        console.log("player disconnected");
        playersCount--;

        // si se encontraba en una partida primero hay que sacarlo de la sala...
        if (roomGame != "") {
            const auxRoom = io.sockets.adapter.rooms[roomGame];

            if (auxRoom.length <= 1) { // si es el ultimo jugador en la sala
                roomsCount--; // reducir el numero de salas
                delete rooms[roomGame];
            } else { // si aun quedan jugadores en la sala
                // quitar el prefab del juego a los demas clientes de esa sala
                socket.in(roomGame).broadcast.emit("PlayerLeavedGame", { id: thisPlayerId });
            }

            socket.leave(roomGame);
            console.log("<" + thisPlayerId + "> has left the room: " + roomGame);
            roomGame = "";
        }

        await Player.findOneAndUpdate({ username: players[thisPlayerId].username }, { status_player: "offline" });
        delete players[thisPlayerId];
        socket.broadcast.emit('disconnected', { id: thisPlayerId });
        socket.broadcast.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });
    });

    /************************ ****** *** ****** | CHAT | ****** *** ****** ************************/
    socket.on('chat:messageGlobal', async function(data) { // CAMBIAR NOMBRE
        const item_chat = new Chat();
        item_chat.message = data.message;
        item_chat.type = 'global';
        item_chat.username = data.username;
        item_chat.img_username = data.image;
        await item_chat.save();
        // Envia a todos
        io.sockets.emit('chat:messageGlobal', data); // envia datos desde aqui (servidor) a todos las conexiones (websockets)
    });

    socket.on('chat:messageToUser', async function(data) {
        const item_chat_p = new Chat();
        item_chat_p.message = data.message;
        item_chat_p.type = 'private'; // mensaje privado
        item_chat_p.username = data.username; // usuario que envia
        item_chat_p.img_username = data.image;
        item_chat_p.user_re = data.user_re; // usuario que recibe el msj
        item_chat_p.img_user_re = data.image_usr_re;

        await item_chat_p.save();

        // envia a la room con nombre del usuario quien recibe el mensaje
        socket.in(data.user_re).broadcast.emit('chat:messageToUser', data);
    });

    // socket.on('chat:typing', (data) => {
    //     // Envia a todos excepto a ti
    //     socket.broadcast.emit('chat:typing', data);
    // });
});