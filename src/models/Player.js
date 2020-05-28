const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const PlayerSchema = new Schema({
    // Información básica
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: { type: String, default: 'default.png', required: true },
    level: { type: Number, default: 1 }, // nivel actual del jugador
    // Información de las barras de estado (nivel de tanques, minas y power ups)
    total_xp: { type: Number, default: 0 }, // experiencia del jugador
    cur_xp_awards: { type: Number, default: 0 }, // experiencia actual que mantiene la barra de premios
    diff_xp_awards: { type: Number, default: 0 }, // experiencia restante que mantiene la barra de premios
    claim_award1: { type: Boolean, default: false }, // estado del reclamo de premio 1
    claim_award2: { type: Boolean, default: false }, // estado del reclamo de premio 2
    claim_award3: { type: Boolean, default: false }, // estado del reclamo de premio 3
    // Información de monedas, gemas, etc
    total_coins: { type: Number, default: 0 },
    total_gems: { type: Number, default: 0 },
    // Información general de partidas
    total_games_vs: { type: Number, default: 0 }, // total de partidas en VS
    cur_ranking_vs: { type: Number, default: 0 }, // rango actual en VS
    max_ranking_vs: { type: Number, default: 0 }, // rango maximo que ha llegado el jugador en VS
    total_wins: { type: Number, default: 0 }, // total de partidas ganadas
    total_losses: { type: Number, default: 0 }, // total de partidas perdidas
    total_draws: { type: Number, default: 0 }, // total de partidas en empate
    total_kills: { type: Number, default: 0 }, // total de kills
    total_deads: { type: Number, default: 0 }, // total de muertes del jugador
    // Información de los niveles de mejoras
    cannon_level_0: { type: Number, default: 1 }, // nivel mejora de C-Alt-1
    cannon_level_1: { type: Number, default: 1 }, // nivel mejora de C-Alt-2
    cannon_level_2: { type: Number, default: 1 }, // nivel mejora de C-Alt-3
    cannon_level_3: { type: Number, default: 1 }, // nivel mejora de C-Alt-4
    cannon_level_4: { type: Number, default: 1 }, // nivel mejora de C-Alt-5
    cannon_level_5: { type: Number, default: 1 }, // nivel mejora de C-Alt-6
    cannon_level_6: { type: Number, default: 1 }, // nivel mejora de C-Alt-7
    cannon_level_7: { type: Number, default: 1 }, // nivel mejora de C-Alt-8
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