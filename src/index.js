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
            id_room: idRoom,
            game_mode: "",
            limit: 0,
            id_team_1: "",
            id_team_2: "",
            id_team_3: "",
            id_team_4: "",
            status: "available" // [available, queue, lock] | disponible, en cola y bloqueada 
        }
        rooms[idRoom] = room;
        roomsCount++;
    }
}

// OYENTE para clientes que entren al servidor
io.on('connection', (socket) => {
    playersCount++;
    var roomGame = ""; // almacena la sala actual en la que se encuentra el jugador
    var room_team = ""; // almacena el id de la sala del equipo actual del jugador
    var enableClock = false; // controla si es posible activar el reloj de partida
    var seconds = 0; // tiempo máximo que puede durar la partida
    var intervalObj; // controla el intervalo de tiempo que envia informacion del reloj a una partida

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
    socket.on('room:game', function(data) {
        var banRoom = false;
        enableClock = false; // evita que envie por accidente emits del temporizador

        // buscar en salas que ya esten creadas... (con alguien ya dentro)
        for (var r in rooms) {
            const roomExist = io.sockets.adapter.rooms[r];
            if (roomExist) { // verificar que la sala exista para evitar errores
                //if (roomExist.length < 2) { // establesco un limite de usuarios por sala
                console.log(rooms[r].status + " | " + rooms[r].game_mode);
                // verificar que la sala este en cola y en el modo de juego elegido por el jugador
                if (rooms[r].status == "queue" && rooms[r].game_mode == data.game_mode && rooms[r].limit == (data.n_players * 2)) {
                    // Si es una partida con equipos...
                    if (data.n_players > 1) {
                        if (data.p_room != "") { // si ya tiene aliados
                            // rooms[r].id_team_1 = data.p_room;
                            // Para los jugadores que ya tienen equipo, solo el lider pasaria por este metodo
                            // el resto de aliados unidos al grupo se unirian directamente a la sala mediante un
                            // metodo rapido...
                        } else {
                            if (rooms[r].id_team_1 == "") // si no esta definido el team 1, lo crea
                                room_team = rooms[r].id_team_1 = shortid.generate();
                            else if (rooms[r].id_team_2 == "") // si no esta definido el team 2, lo crea
                                room_team = rooms[r].id_team_2 = shortid.generate();
                            else {
                                const auxTeam1 = io.sockets.adapter.rooms[rooms[r].id_team_1];
                                if (auxTeam1) { // ver si el equipo esta creado
                                    if (auxTeam1.length < data.n_players) // ver si el equipo no esta lleno
                                        room_team = rooms[r].id_team_1;
                                    else { // si el equipo esta lleno se pregunta por el segundo equipo
                                        const auxTeam2 = io.sockets.adapter.rooms[rooms[r].id_team_2];
                                        if (auxTeam2) {
                                            if (auxTeam2.length < data.n_players) // si no esta lleno
                                                room_team = rooms[r].id_team_2;
                                            else // si está lleno, avanz a comprobar la sig sala.
                                                continue;
                                        } else
                                            room_team = rooms[r].id_team_2 = shortid.generate();
                                    }
                                } else
                                    room_team = rooms[r].id_team_1 = shortid.generate();
                            }

                            socket.join(room_team); // unirse a esta sala para ir a un equipo
                            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED to the room [TEAM]: " + room_team);
                            io.to(room_team).emit('game:room_team', { room_team: room_team });
                        }
                    }
                    banRoom = true;

                    roomGame = rooms[r].id_room;
                    socket.join(roomGame); // unirse a esta sala
                    players[thisPlayerId].roomGame = roomGame;
                    io.to(roomGame).emit('game:players_queue', { n_queue_players: roomExist.length });
                    console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED 2 to the room: " + rooms[r].id_room + " | game_mode: " + rooms[r].game_mode + " | limit: " + rooms[r].limit + " | status: " + rooms[r].status);

                    // mantener al cliente en cola, hasta cumplir la condición
                    const statusRoom = io.sockets.adapter.rooms[r];
                    if (statusRoom.length == rooms[r].limit) {
                        if (rooms[r].game_mode == "Versus") {
                            seconds = 220; // 3 minutos y 40 segundos... (10 seg para preparar el reloj)
                            enableClock = true; // para habilitar el temporizador en el juego
                        }
                        rooms[r].status = "lock";
                        io.to(roomGame).emit('game:start', { message: 'OK' });
                    } else
                        break;

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
                // Si la sala esta disponible y no tiene modo de juego o es igual al modo que ha seleccionado
                if (rooms[r].status == "available" && (rooms[r].game_mode == "" /* || rooms[r].game_mode == data.game_mode*/ )) {
                    var lim = 2;
                    if (data.game_mode == "Versus")
                        rooms[r].limit = data.n_players * 2;
                    // ESTE BLOQUE DEBERIA SER REUTILIZABLE ...
                    if (data.n_players > 1) {
                        if (data.p_room != "") { // si ya tiene aliados
                            rooms[r].id_team_1 = data.p_room;
                            // posiblemente aqui deberia devolver el estado de la sala para que los jugadores aliados
                            // tenga info de la sala a la que deben conectarse todos... 
                        } else {
                            rooms[r].id_team_1 = shortid.generate();
                            room_team = rooms[r].id_team_1;
                            socket.join(room_team); // unirse a esta sala para el primer equipo
                            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED to the room [TEAM]: " + room_team);
                            io.to(room_team).emit('game:room_team', { room_team: room_team });

                        }
                    }

                    rooms[r].status = "queue"; // cambiar el estado de la sala de "disponible" a "en cola"
                    rooms[r].game_mode = data.game_mode;
                    banRoom = true;
                    socket.join(rooms[r].id_room); // unirse a esta sala
                    roomGame = rooms[r].id_room;
                    players[thisPlayerId].roomGame = roomGame;
                    const roomExist = io.sockets.adapter.rooms[r];
                    io.to(roomGame).emit('game:players_queue', { n_queue_players: roomExist.length });
                    console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED 1 to the room: " + rooms[r].id_room + " | game_mode: " + rooms[r].game_mode + " | limit: " + rooms[r].limit + " | status: " + rooms[r].status);
                    break;
                }
            }
        }

        // crea una nueva sala (de estar llenas las demas)
        if (!banRoom) { // si no encontro una sala disponible
            banRoom = true;
            const idRoom = shortid.generate();
            var lim = 2;
            if (data.game_mode == "Versus")
                lim = data.n_players * 2;
            // ESTE BLOQUE DEBERIA SER REUTILIZABLE ...
            if (data.n_players > 1) {
                if (data.p_room != "") { // si ya tiene aliados
                    rooms[r].id_team_1 = data.p_room;
                    // posiblemente aqui deberia devolver el estado de la sala para que los jugadores aliados
                    // tenga info de la sala a la que deben conectarse todos... 
                } else {
                    rooms[r].id_team_1 = shortid.generate();
                    socket.join(rooms[r].id_team_1); // unirse a esta sala para el primer equipo
                    room_team = rooms[r].id_team_1;
                    console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has JOINED to the room [TEAM]: " + room_team);
                    io.to(room_team).emit('game:room_team', { room_team: room_team });
                }
            }
            var room = { id_room: idRoom, game_mode: data.game_mode, limit: lim, status: "queue" }
            rooms[idRoom] = room;

            socket.join(idRoom); // unirse a esta sala
            roomGame = idRoom;
            players[thisPlayerId].roomGame = roomGame;
            roomsCount++;
            io.to(roomGame).emit('game:players_queue', { n_queue_players: roomExist.length });
            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has CREATED to the room: " + rooms[room].id_room + " | game_mode: " + rooms[room].game_mode + " | limit: " + rooms[room].limit + " | status: " + rooms[room].status);
        }

        // Iniciar temporizador para la sala que acaba de iniciar una partida
        if (enableClock && data.game_mode == "Versus")
            interval();
    });

    function interval() {
        intervalObj = setInterval(() => {
            seconds = seconds - 10;
            console.log("room: <" + roomGame + "> time: " + seconds);
            io.to(roomGame).emit('clock:update', { time: seconds });
            if (seconds <= 0) {
                io.to(roomGame).emit('clock:timeOut', { time: seconds });
                clearInterval(intervalObj);
            }
        }, 10000); // cada 10 segundos para reducir carga al server
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
            io.to(roomGame).emit('game:players_queue', { n_queue_players: statusRoom.length });
            console.log("<" + thisPlayerId + "><" + players[thisPlayerId].username + "> has LEFT the room: " + roomGame);
            roomGame = "";
            players[thisPlayerId].roomGame = "";

            // salir de sala de equipo (de terner uno)
            if (room_team != "") {
                socket.leave(room_team);
                room_team = "";
            }
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
            p.updated_at = Date.now();
            await p.save();
        }
        players[thisPlayerId].username = data.username;
        socket.join(data.username); // unirse a esta sala oyente de notificaciones personales

        socket.broadcast.emit('player:online', { id: thisPlayerId, user: data.username });
    });

    socket.on('player:spawn', async function(data) {
        // Envia para todos los jugadores de la sala.
        socket.in(roomGame).broadcast.emit('player:spawn', data);
        // Almacena en la bd
        const p = await Player.findById(data.id_database);
        p.status_player = "in a game";
        p.total_games_vs++;
        p.updated_at = Date.now();
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

    // actualiza si el jugador pone una mina
    socket.on('player:mine', function(data) {
        socket.in(roomGame).broadcast.emit('player:mine', data);
    });

    // notificar y muestra a los jugadores del jugador que ha muerto
    socket.on('player:dead', async function(data) {
        //console.log("info kill to room <" + roomGame + "> = ", data);
        io.to(roomGame).emit('player:dead', data);

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

    // habilitar el prefab del jugador en los otros clientes
    socket.on('player:respawn', function(data) {
        socket.in(roomGame).broadcast.emit('player:respawn', data);
    });

    // almacenar en tiempo real los estados de las partidas jugadas
    socket.on('player:status_game', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            switch (data.status_game_vs) {
                case "Victory":
                    p.total_wins++;
                    break;
                case "Defeat":
                    p.total_losses++;
                    break;
                case "Draw":
                    p.total_draws++;
                    break;
            }
            p.updated_at = Date.now();
            await p.save();
        }
    });

    // almacenar en tiempo real los estados de las partidas jugadas
    socket.on('player:status_mission', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            switch (data.mission_id) {
                case "MSD001":
                    p.msd001_status = data.mission_status;
                    p.msd001_value = data.mission_value;
                    break;
                case "MSD002":
                    p.msd002_status = data.mission_status;
                    p.msd002_value = data.mission_value;
                    break;
                case "MSD003":
                    p.msd003_status = data.mission_status;
                    p.msd003_value = data.mission_value;
                    break;
                case "MSD004":
                    p.msd004_status = data.mission_status;
                    p.msd004_value = data.mission_value;
                    break;
                case "MSD005":
                    p.msd005_status = data.mission_status;
                    p.msd005_value = data.mission_value;
                    break;
                case "RESET":
                    p.msd001_status = "Incomplete";
                    p.msd001_value = 0;
                    p.msd002_status = "Incomplete";
                    p.msd002_value = 0;
                    p.msd003_status = "Incomplete";
                    p.msd003_value = 0;
                    p.msd004_status = "Incomplete";
                    p.msd004_value = 0;
                    p.msd005_status = "Incomplete";
                    p.msd005_value = 0;
                    break;
            }
            p.updated_at = Date.now();
            p.last_date_mission_daily = Date.now();
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
            p.cur_ranking_vs = data.cur_ranking_vs;
            p.max_ranking_vs = data.max_ranking_vs;
            p.updated_at = Date.now();
            await p.save();
        }
    });

    // almacenar en tiempo real las monedas y gemas del jugador
    socket.on('player:save_coins', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.total_coins = data.total_coins;
            p.total_gems = data.total_gems;
            p.updated_at = Date.now();
            await p.save();
        }
    });

    // almacenar en tiempo real el marco y la imagen de perfil
    socket.on('player:save_image', async function(data) {
        const p = await Player.findById(data.id_database);
        if (p) {
            p.image = data.image;
            p.img_frame = data.img_frame;
            p.updated_at = Date.now();
            await p.save();
        }
    });

    // almacenar en tiempo real las monedas del jugador
    socket.on('player:save_status_claim_award', async function(data) {
        const p = await Player.findById(data.id_database);
        switch (data.pos_award) {
            case 1:
                p.claim_award1 = data.claim_award;
                break;
            case 2:
                p.claim_award2 = data.claim_award;
                break;
            case 3:
                p.claim_award3 = data.claim_award;
                break;
            case 4:
                p.claim_award1 = p.claim_award2 = p.claim_award3 = data.claim_award;
                break;
        }
        p.updated_at = Date.now();
        await p.save();
    });

    // actualizar niveles de las mejoras de los cañones
    socket.on('player:save_status_level_cannon', async function(data) {
        const p = await Player.findById(data.id_database);
        p.cannon_level_0 = data.cannon_level_0;
        p.cannon_level_1 = data.cannon_level_1;
        p.cannon_level_2 = data.cannon_level_2;
        p.cannon_level_3 = data.cannon_level_3;
        p.cannon_level_4 = data.cannon_level_4;
        p.cannon_level_5 = data.cannon_level_5;
        p.cannon_level_6 = data.cannon_level_6;
        p.cannon_level_7 = data.cannon_level_7;
        p.updated_at = Date.now();
        await p.save();
    });

    // actualizar niveles de las mejoras de los tanques
    socket.on('player:save_status_level_hull', async function(data) {
        const p = await Player.findById(data.id_database);
        p.hull_level_0 = data.hull_level_0;
        p.hull_level_1 = data.hull_level_1;
        p.hull_level_2 = data.hull_level_2;
        p.hull_level_3 = data.hull_level_3;
        p.hull_level_4 = data.hull_level_4;
        p.hull_level_5 = data.hull_level_5;
        p.hull_level_6 = data.hull_level_6;
        p.hull_level_7 = data.hull_level_7;
        p.updated_at = Date.now();
        await p.save();
    });

    // actualizar niveles de las mejoras de las minas
    socket.on('player:save_status_level_mines', async function(data) {
        const p = await Player.findById(data.id_database);
        p.mine_level_bomb = data.mine_level_bomb;
        p.mine_level_stun = data.mine_level_stun;
        p.mine_level_freeze = data.mine_level_freeze;
        p.updated_at = Date.now();
        await p.save();
    });

    // actualizar niveles de las mejoras de las powerups
    socket.on('player:save_status_level_powerups', async function(data) {
        const p = await Player.findById(data.id_database);
        p.powerup_level_shield = data.powerup_level_shield;
        p.powerup_level_speed = data.powerup_level_speed;
        p.powerup_level_damage = data.powerup_level_damage;
        p.powerup_level_repair = data.powerup_level_repair;
        p.updated_at = Date.now();
        await p.save();
    });

    // almacecna la solicitud de amistad e informa al jugador dirigido
    socket.on('player:save_friend_request', async function(data) {
        const newFriend = new Friend();
        newFriend.user_first = data.user_first;
        newFriend.user_second = data.user_second;
        newFriend.status = 0; // solicitud
        const str1 = shortid.generate();
        const str2 = shortid.generate();
        newFriend.private_room = str1 + str2;

        await newFriend.save();

        socket.join(data.user_second); // entrar a la sala privada de notificaciones del jugador
        io.to(data.user_second).emit('player:update_all_request', { user_request: data.user_first });
        socket.leave(data.user_second); // salir de la sala una vez que se ha enviado la solicitud
    });

    // almacecena la amistad e informa al jugador dirigido
    socket.on('player:save_friend', async function(data) {
        const fr = await Friend.findById(data.id_request);
        if (fr) {
            fr.status = 1; // amigo
            await fr.save();

            socket.join(data.user); // entrar a la sala privada de notificaciones del jugador
            io.to(data.user).emit('player:update_all_request', { user_request: data.user });
            socket.leave(data.user); // salir de la sala una vez que se ha enviado la solicitud
        }
    });

    // almacecena la amistad e informa al jugador dirigido
    socket.on('player:remove_friendship', async function(data) {
        const fr = await Friend.findById(data.id_request);
        if (fr) {
            fr.remove();
            socket.join(data.user); // entrar a la sala privada de notificaciones del jugador
            io.to(data.user).emit('player:update_all_request', { user_request: data.user });
            socket.leave(data.user); // salir de la sala una vez que se ha enviado la solicitud
        } else
            console.log("Ha ocurrido un error al intentar borrar la solicitud.");
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
            roomGame = "";
        }
        // salir de sala de equipo (de terner uno)
        if (room_team != "") {
            socket.leave(room_team);
            room_team = "";
        }
        // almacenar el estado de desconectado al jugador
        await Player.findOneAndUpdate({ username: players[thisPlayerId].username }, { status_player: "offline" });
        delete players[thisPlayerId];
        socket.broadcast.emit('disconnected', { id: thisPlayerId });
        socket.broadcast.emit('updateTotalPlayers', { nPlayers: playersCount.toString() });
        console.log("player disconnected");
    });

    /************************ ****** *** ****** | CHAT | ****** *** ****** ************************/
    socket.on('chat:JoinToChatRoom', async function(data) {
        // console.log(players[thisPlayerId].username + "Joining to chat room: " + data.private_room);
        socket.join(data.private_room); // unirse a esta sala
    });

    socket.on('chat:messageGlobal', async function(data) {
        const item_chat = new Chat();
        item_chat.username = data.username;
        item_chat.message = data.message;
        item_chat.img_username = data.image;
        item_chat.type = 'global';
        await item_chat.save();
        // Envia a todos
        io.sockets.emit('chat:messageGlobal', data); // envia datos desde aqui (servidor) a todos las conexiones (websockets)
    });

    socket.on('chat:messageToUser', async function(data) {
        const item_chat_p = new Chat();
        item_chat_p.username = data.username; // usuario que envia el msj
        item_chat_p.message = data.message;
        item_chat_p.img_username = data.image;
        item_chat_p.type = 'private'; // mensaje privado
        item_chat_p.user_re = data.user_re; // usuario que recibe el msj
        item_chat_p.private_room = data.private_room;
        await item_chat_p.save();
        // envia a la room del usuario quien recibe el mensaje
        io.to(data.private_room).emit('chat:messageUser', data);
    });

    // socket.on('chat:typing', (data) => {
    //     // Envia a todos excepto a ti
    //     socket.broadcast.emit('chat:typing', data);
    // });
});