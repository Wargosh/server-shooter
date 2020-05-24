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

// generar salas aleatorias
if (roomsCount == 0) {
    for (let i = 0; i < 500; i++) {
        const idRoom = shortid.generate();
        var room = {
            id_room: idRoom
        }
        rooms[idRoom] = room;
        roomsCount++;
    }
}

// OYENTE para clientes que entren al servidor
io.on('connection', (socket) => {
    playersCount++;
    var roomGame = "";
    var enableClock = false;
    var seconds = 0; // tiempo máximo que puede durar la partida
    var intervalObj;

    const thisPlayerId = shortid.generate();
    console.log('new connection. ID Socket:' + socket.id + " ID: " + thisPlayerId);

    var player = {
        id: thisPlayerId,
        username: "none",
        roomGame: ""
    }

    players[thisPlayerId] = player;

    socket.emit('connectionEstabilished', { id: thisPlayerId });

    // actualizar a los demas y a ti mismo del total de jugadores
    socket.broadcast.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });
    socket.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });

    // el jugador 'entra' a una sala de juego... aleatoria
    socket.on('room:game', function() {
        var banRoom = false;
        enableClock = false; // evita que envie por accidente emits del temporizador

        // buscar en salas que ya esten creadas... (con alguien ya dentro)
        for (var r in rooms) {
            const auxRoom = io.sockets.adapter.rooms[r];
            if (auxRoom) {
                if (auxRoom.length < 2) { // establesco un limite de usuarios por sala
                    banRoom = true;
                    enableClock = true; // para habilitar el temporizador en el juego
                    seconds = 300; // 5 minutos

                    socket.join(r); // unirse a esta sala
                    roomGame = r;
                    players[thisPlayerId].roomGame = roomGame;

                    // mantener al cliente en cola, hasta cumplir la condición
                    const statusRoom = io.sockets.adapter.rooms[r];
                    if (statusRoom.length == 2) {
                        io.to(roomGame).emit('game:start', { message: 'OK' });
                    }

                    // OJO...
                    // Esta funcion no recicla, ni elimina los objetos creados... aún
                    // Por lo que es necesario arreglarlo para no saturar el servidor.
                    setTimeout(function() {
                        for (let i = 0; i < 20; i++) {
                            const idBox = shortid.generate();
                            var box = {
                                id: idBox,
                                posX: helpers.getRandomInt(-25, 25),
                                posY: helpers.getRandomInt(-25, 25)
                            }
                            boxes[idBox] = box;
                            boxesCount++;
                            io.to(roomGame).emit('box:spawn', box);
                        }
                    }, 2000); // esperar 2 segundos...
                    break;
                }
            }
        }

        // establecer una sala disponible (vacia) para el jugador
        if (!banRoom) {
            for (var r in rooms) {
                const auxRoom = io.sockets.adapter.rooms[r];
                if (!auxRoom) {
                    banRoom = true;
                    socket.join(r); // unirse a esta sala
                    roomGame = r;
                    players[thisPlayerId].roomGame = roomGame;
                    break;
                }
            }
        }

        // crea una nueva sala (de estar llenas las demas)
        if (!banRoom) { // si no encontro una sala disponible
            banRoom = true;
            const idRoom = shortid.generate();
            var room = { id_room: idRoom }
            rooms[idRoom] = room;

            socket.join(idRoom); // unirse a esta sala
            roomGame = idRoom;

            roomsCount++;
        }
        console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED to the room: " + roomGame);

        // Iniciar temporizador para la sala que acaba de iniciar una partida
        if (enableClock) {
            interval();
        }
    });

    function interval() {
        intervalObj = setInterval(() => {
            seconds--;
            //console.log("room: <" + roomGame + "> time: " + seconds);
            io.to(roomGame).emit('clock:update', { time: seconds });
            if (seconds <= 0) {
                io.to(roomGame).emit('clock:timeOut', { time: seconds });
                clearInterval(intervalObj);
            }
        }, 1000);
    }

    // el jugador sale de una sala de juego...
    socket.on('room:leave', function() {
        if (roomGame != "") {
            enableClock = false; // evita que envie por accidente emits del temporizador
            clearInterval(intervalObj);

            // notificar a los demas clientes de esa sala
            io.to(roomGame).emit("player:leavedGame", { id: thisPlayerId });

            // borrar sala...
            const statusRoom = io.sockets.adapter.rooms[roomGame];
            if (statusRoom.length <= 1) {
                delete rooms[roomGame];
                roomsCount--;
            }

            // salir de la sala
            socket.leave(roomGame);

            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has LEFT the room: " + roomGame);

            roomGame = "";
            players[thisPlayerId].roomGame = "";
        }
    });

    /*socket.on('leaderboard', async function () {
        const bestPlayers = await new Player.find().sort({ rank: 'desc' }).limit(5);
        if (bestPlayers)
            socket.emit('leaderboard', { ranks: bestPlayers });
    });*/

    socket.on('box:spawn', function(data) {
        for (var b in boxes) {
            if (b == data.id) {
                delete boxes[data.id];
                boxesCount--;

                socket.in(roomGame).broadcast.emit('box:remove', { id: data.id });

                const idBox = shortid.generate();
                var box = {
                    id: idBox,
                    posX: helpers.getRandomInt(-25, 25),
                    posY: helpers.getRandomInt(-25, 25)
                }
                boxes[idBox] = box;
                boxesCount++;

                setTimeout(function() {
                    io.to(roomGame).emit('box:spawn', box);
                }, 10000);

                // generar item random
                var item = { id: data.id }
                item = data;
                item.id = data.id;
                item.item = helpers.getRandomInt(0, data.total);
                items[data.id] = item;

                io.to(roomGame).emit('item:spawn', item);
                console.log("item: ", item);
                break;
            }
        }
    });

    socket.on('item:remove', function(data) {
        for (var i in items) {
            if (i == data.id) {
                delete items[data.id];

                io.to(roomGame).emit('item:remove', { id: data.id });
                break;
            }
        }
    });

    // el jugador acaba de iniciar sesion
    socket.on('player:online', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.status_player = "online";
            await p.save();
        }
        players[thisPlayerId].username = data.username;

        socket.broadcast.emit('player:online', { id: thisPlayerId, user: data.username });
    });

    socket.on('player:spawn', async function(data) {
        // Envia para todos los jugadores de la sala.
        socket.in(roomGame).broadcast.emit('player:spawn', data);
        // Almacena en la bd
        const p = await Player.findById(data.id_database);
        p.status_player = "in a game";
        p.total_games_vs++;
        await p.save();
    });

    // actualiza la posicion y rotacion (y demas info) del jugador hacia los demás jugadores
    socket.on('player:position', function(data) {
        socket.in(roomGame).broadcast.emit('player:position', data);
    });

    // actualiza si el jugador ha recibido o perdido salud
    socket.on('player:health', function(data) {
        socket.in(roomGame).broadcast.emit('player:health', data);
    });

    // actualiza si el jugador dispara
    socket.on('player:shoot', function(data) {
        io.to(roomGame).emit('player:shoot', data);
    });

    // notificar a los demas jugadores del jugador que ha muerto
    socket.on('player:dead', async function(data) {
        console.log("info kill = ", data);
        socket.in(roomGame).broadcast.emit('player:dead', data);

        const p = await Player.findById(data.id_database);
        if (p) {
            p.total_deads++;
            await p.save();
        }
    });

    // almacenar en tiempo real cuando el jugador obtiene una kill
    socket.on('player:getKill', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.total_kills++;
            await p.save();
        }
    });

    // almacenar en tiempo real la experiencia del jugador
    socket.on('player:save_XP', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.total_xp = data.xp_player;
            p.cur_xp_awards = data.xp_awards_curr;
            p.diff_xp_awards = data.xp_awards_diff;
            await p.save();
        }
    });

    // almacenar en tiempo real las monedas del jugador
    socket.on('player:save_coins', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.total_coins += data.total_coins;
            await p.save();
        }
    });

    // habilitar el prefab del jugador en los otros clientes
    socket.on('player:respawn', function(data) {
        socket.in(roomGame).broadcast.emit('player:respawn', data);
    });

    // Cuando un jugador se desconecta
    socket.on('disconnect', async function() {
        playersCount--;

        // si se encontraba en una partida primero hay que sacarlo de la sala...
        if (roomGame != "") {
            // sacarlo de la sala
            socket.leave(roomGame);
            clearInterval(intervalObj); // terminar ciclo del reloj (de haber uno)

            // borrar sala...
            const statusRoom = io.sockets.adapter.rooms[roomGame];
            if (statusRoom) {
                if (statusRoom.length <= 1) {
                    delete rooms[roomGame];
                    roomsCount--;
                }
            }

            // notificar a los demas que salio de la sala
            socket.in(roomGame).broadcast.emit("player:leavedGame", { id: thisPlayerId });
            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has LEFT the room: " + roomGame);

            // console.log("<" + thisPlayerId + "> has left the room: " + roomGame);
            roomGame = "";
        }

        await Player.findOneAndUpdate({ username: players[thisPlayerId].username }, { status_player: "offline" });
        delete players[thisPlayerId];
        socket.broadcast.emit('disconnected', { id: thisPlayerId });
        socket.broadcast.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });
        console.log("player disconnected");
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