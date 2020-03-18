const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatSchema = new Schema({
    message: { type: String, required: true }, // contendo del mensaje
    type: { type: String, required: false }, // privado, global, etc...
    username: { type: String, required: true }, // propietario del mensaje
    img_username: { type: String, required: true }, // (Imagen) propietario del mensaje
    user_re: { type: String, required: false }, // quien recibe el mensaje (dejar vacio si es de tipo global)
    img_user_re: { type: String, required: false }, // (Imagen) quien recibe el mensaje (dejar vacio si es de tipo global)
    created_at: { type: Date, default: Date.now } // fecha y hora de envio del mensaje
});

module.exports = mongoose.model('Chat', ChatSchema);