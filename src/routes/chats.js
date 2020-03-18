const router = require('express').Router();

const Chat = require('../models/Chat');

router.post('/chat/global/get_messages', async (req, res) => {
    const messages = await Chat.find({ type: 'global' }).sort({ created_at: 'desc' }).limit(10);
    if (messages) {
        res.send({ messages: messages });
    } else {
        res.send({ error: 'Ha ocurrido un error' });
    }
});

module.exports = router;