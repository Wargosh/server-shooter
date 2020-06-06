const router = require('express').Router();
const helpers = require('../helpers');

const Player = require('../models/Player');
const Friend = require('../models/Friend');
const { randomString } = require('../helpers/libs');

router.post('/player/logingame', async(req, res) => {
    const { email, password } = req.body;
    const player = await Player.findOne({ email: email });
    if (player) {
        const match = await player.matchPassword(password);
        if (match) {
            res.send(player);
        } else {
            res.send({ message: 'Email o clave incorrecta.' });
        }
    } else {
        res.send({ message: 'Email o clave incorrecta.' });
    }
});

router.post('/player/register', async(req, res) => {
    const { username, email, password } = req.body;
    const emailPlayer = await Player.findOne({ email: email });
    if (emailPlayer) {
        res.send({ message: 'Este email ya se encuentra registrado.' });
    } else {
        const usernamePlayer = await Player.findOne({ username: username });
        if (usernamePlayer) {
            res.send({ message: 'Nombre de usuario ya existente.' });
        } else {
            const newPlayer = new Player({ username, email, password });
            newPlayer.password = await newPlayer.encryptPassword(password);
            await newPlayer.save();
            res.send({ message: 'Cuenta Creada.' });
        }
    }
});

router.post('/searchplayer', async(req, res) => {
    const { username } = req.body;
    const players = await Player.find({ 'username': new RegExp(username, 'i') }, { username: 1, level: 1, total_games_vs: 1, cur_ranking_vs: 1, total_wins: 1, total_kills: 1, image: 1, status_player: 1, updated_at: 1 }).limit(25);
    if (players) {
        for (var i in players) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del jugador
            players[i].set('timeAgo', helpers.timeago(Date.parse(players[i].updated_at)), { strict: false });
        }
        res.send({ players: players });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener el listado de usuarios' });
    }
});

// Obtiene la lista de solicitudes de amistad
router.post('/ListAllRequest', async(req, res) => {
    const { username } = req.body;
    const requests = await Friend.find({ $or: [{ user_first: username }, { user_second: username }] });
    if (requests) {
        res.send({ requests: requests });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener el listado de todas las solicitudes' });
    }
});

// elimina una solicitud de amistad o amigo
router.post('/remove_friendship', async(req, res) => {
    const { id } = req.body;
    const aux = await Friend.findOne({ _id: id });
    if (aux) {
        aux.remove();
        res.send({ msg: 'Se elimino la solicitud correctamente.' });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar borrar la solicitud.' });
    }
});

router.get('/users/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;