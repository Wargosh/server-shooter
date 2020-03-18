const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const PlayerSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    image: {type: String, default: 'default.png', required: true},
    rank: {type: Number, default: 0},
    status_player: {type: String, default: 'offline'},
    status_account: {type: String, default: 'active'},
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

PlayerSchema.methods.encryptPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = bcrypt.hash(password, salt);
    return hash;
};

PlayerSchema.methods.matchPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Player', PlayerSchema);