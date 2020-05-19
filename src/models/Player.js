const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const PlayerSchema = new Schema({
    // Información básica
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: { type: String, default: 'default.png', required: true },
    // Información de las barras de estado (nivel de tanques, minas y power ups)
    // Información de monedas, gemas, etc
    total_coins: { type: Number, default: 0 },
    total_gems: { type: Number, default: 0 },
    // Información general de partidas
    total_games: { type: Number, default: 0 },
    total_kills: { type: Number, default: 0 },
    total_deads: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    // Información del estado de la cuenta, etc
    status_player: { type: String, default: 'offline' },
    status_account: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

PlayerSchema.methods.encryptPassword = async(password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = bcrypt.hash(password, salt);
    return hash;
};

PlayerSchema.methods.matchPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Player', PlayerSchema);