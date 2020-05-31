const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendSchema = new Schema({
    user_first: { type: String, required: true }, // usuario que envia la solicitud
    user_second: { type: String, required: true }, // usuario a quien va dirigido
    img_user_re: { type: String, required: true }, // (Imagen) 
    img_user_re: { type: String, required: true }, // (Imagen)
    private_room: { type: String, required: true }, // cadena utilizada para la comunicación entre ambos usuarios
    status: { type: Number, required: true, default: 0 }, // [0=solicitud, 1=amigos, 3=bloqueo]
    created_at: { type: Date, default: Date.now }, // fecha y hora de creacion de la solicitud 
    updated_at: { type: Date, default: Date.now } // fecha y hora de cambio o actualización
});

module.exports = mongoose.model('Friend', FriendSchema);