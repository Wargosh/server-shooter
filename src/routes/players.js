const router = require('express').Router();

const Player = require('../models/Player');
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

router.get('/searchplayer', async(req, res) => {
    const { username } = req.body;
    const players = await Player.find({ 'username': new RegExp(username, 'i') }).limit(25);

    res.send(players);
});

router.get('/users/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router;