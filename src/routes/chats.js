const router = require('express').Router();
const Chat = require('../models/Chat');
const helpers = require('../helpers');

router.post('/chat/global/get_messages', async(req, res) => {
    const messages = await Chat.find({ type: 'global' }).sort({ created_at: 'desc' }).limit(20);
    if (messages) {
        res.send({ messages: messages });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener EL CHAT GLOBAL' });
    }
});

router.post('/chat/user/get_messages', async(req, res) => {
    const { private_room } = req.body;
    const messages = await Chat.find({ private_room: private_room, type: 'private' }).sort({ created_at: 'desc' }).limit(20);
    if (messages) {
        for (var i in messages) { // recorre los jugadores encontrados
            // establece un string temporal que menciona el ultimo acceso del mensaje
            messages[i].set('timeAgo', helpers.timeago(Date.parse(messages[i].created_at)), { strict: false });
        }
        res.send({ messages: messages });
    } else {
        res.send({ error: 'Ha ocurrido un error al intentar obtener EL CHAT PRIVADO' });
    }
});

module.exports = router;