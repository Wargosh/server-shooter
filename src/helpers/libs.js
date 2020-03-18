const helpers = {};

helpers.randomString = () => {
    // Creo una cadena los posibles caracteres que quiero generar
    const possible = 'abcdefghijkmnlopqrstuvwxyzABCDEFGHIJKMNLOPQRSTUVWXYZ0123456789';
    let randomChar = 0;
    
    // Obtiene y concatena 32 caracteres aleatorios...
    for (let i = 0; i < 31; i++) {
        randomChar += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return randomChar; // devuelve la cadena aleatoria
};

module.exports = helpers;