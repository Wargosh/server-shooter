const socket = io();

// variables
let nPlayers = document.getElementById('txtNumPlayers');

// OYENTES
// actualiza el numero de jugadores activos
socket.on('updateTotalPlayers', function (data) {
    nPlayers.innerHTML = `<br><p>Active players: <strong>${data.nPlayers}</strong></p>`;
});