const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const PlayerSchema = new Schema({
    // Información básica
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: { type: String, default: 'avatar_2', required: true }, // imagen de perfil de usuario
    img_frame: { type: String, default: 'frame_0', required: true }, // marco de la imagen
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
    // Información de los niveles de mejoras - cañones
    cannon_level_0: { type: Number, default: 1 }, // nivel mejora de C-Alt-1
    cannon_level_1: { type: Number, default: 1 }, // nivel mejora de C-Alt-2
    cannon_level_2: { type: Number, default: 1 }, // nivel mejora de C-Alt-3
    cannon_level_3: { type: Number, default: 1 }, // nivel mejora de C-Alt-4
    cannon_level_4: { type: Number, default: 1 }, // nivel mejora de C-Alt-5
    cannon_level_5: { type: Number, default: 1 }, // nivel mejora de C-Alt-6
    cannon_level_6: { type: Number, default: 1 }, // nivel mejora de C-Alt-7
    cannon_level_7: { type: Number, default: 1 }, // nivel mejora de C-Alt-8
    // Información de los niveles de mejoras - tanques
    hull_level_0: { type: Number, default: 1 }, // nivel mejora de H-Alt-1
    hull_level_1: { type: Number, default: 1 }, // nivel mejora de H-Alt-2
    hull_level_2: { type: Number, default: 1 }, // nivel mejora de H-Alt-3
    hull_level_3: { type: Number, default: 1 }, // nivel mejora de H-Alt-4
    hull_level_4: { type: Number, default: 1 }, // nivel mejora de H-Alt-5
    hull_level_5: { type: Number, default: 1 }, // nivel mejora de H-Alt-6
    hull_level_6: { type: Number, default: 1 }, // nivel mejora de H-Alt-7
    hull_level_7: { type: Number, default: 1 }, // nivel mejora de H-Alt-8
    // Información de los niveles de mejoras - mines
    mine_level_bomb: { type: Number, default: 1 }, // nivel mejora de mina 1
    mine_level_stun: { type: Number, default: 1 }, // nivel mejora de mina 2
    mine_level_freeze: { type: Number, default: 1 }, // nivel mejora de mina 3
    // Información de los niveles de mejoras - power ups
    powerup_level_shield: { type: Number, default: 1 }, // nivel mejora de powerup 1
    powerup_level_speed: { type: Number, default: 1 }, // nivel mejora de powerup 2
    powerup_level_damage: { type: Number, default: 1 }, // nivel mejora de powerup 3
    powerup_level_repair: { type: Number, default: 1 }, // nivel mejora de powerup 4
    // Información de las misiones
    last_date_mission_daily: { type: Date, default: Date.now }, // obtiene la ultima fechahora de realizar una mision diaria, para poder restablecer
    msd001_status: { type: String, default: 'Incomplete' },
    msd001_value: { type: Number, default: 0 },
    msd002_status: { type: String, default: 'Incomplete' },
    msd002_value: { type: Number, default: 0 },
    msd003_status: { type: String, default: 'Incomplete' },
    msd003_value: { type: Number, default: 0 },
    msd004_status: { type: String, default: 'Incomplete' },
    msd004_value: { type: Number, default: 0 },
    msd005_status: { type: String, default: 'Incomplete' },
    msd005_value: { type: Number, default: 0 },
    msw001_status: { type: String, default: 'Incomplete' },
    msw001_value: { type: Number, default: 0 },
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