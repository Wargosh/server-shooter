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
    cur_rank: { type: Number, default: 0 }, // rango actual
    max_rank: { type: Number, default: 0 }, // rango maximo que ha llegado el jugador
    total_xp: { type: Number, default: 0 }, // experiencia del jugador
    total_xp_awards: { type: Number, default: 0 }, // experiencia restante que mantiene la barra de premios
    // Información de monedas, gemas, etc
    total_coins: { type: Number, default: 0 },
    total_gems: { type: Number, default: 0 },
    // Información general de partidas
    total_games_vs: { type: Number, default: 0 }, // total de partidas en VS
    total_wins: { type: Number, default: 0 }, // total de partidas ganadas
    total_losses: { type: Number, default: 0 }, // total de partidas perdidas
    total_draws: { type: Number, default: 0 }, // total de partidas en empate
    total_kills: { type: Number, default: 0 }, // total de kills
    total_deads: { type: Number, default: 0 }, // total de muertes del jugador
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