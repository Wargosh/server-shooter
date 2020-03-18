const router = require('express').Router();
const fs = require('fs-extra');
const path = require('path');

const Player = require('../models/Player');
const { randomString } = require('../helpers/libs');

router.post('/player/logingame', async (req, res) => {
    const { email, password } = req.body;
    const player = await Player.findOne({ email: email });
    if (player) {
        const match = await player.matchPassword(password);
        if (match) {
            res.send(player);
        } else {
            res.send({ message: 'Email o clave incorrecta.' });
        }
    } else {
        res.send({ message: 'Email o clave incorrecta.' });
    }
});

router.post('/player/register', async (req, res) => {
    const { username, email, password } = req.body;
    const emailPlayer = await Player.findOne({ email: email });
    if (emailPlayer) {
        res.send({ message: 'Este email ya se encuentra registrado.' });
    } else {
        const usernamePlayer = await Player.findOne({ username: username });
        if (usernamePlayer) {
            res.send({ message: 'Nombre de usuario ya existente.' });
        } else {
            const newPlayer = new Player({ username, email, password });
            newPlayer.password = await newPlayer.encryptPassword(password);
            await newPlayer.save();
            res.send({ message: 'Cuenta Creada.' });
        }
    }
});

router.get('/users/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// Sube una nueva imagen de perfil (de cumplir con los parametros)
router.post('/player/update_image', (req, res) => {
    const saveImage = async () => {
        const { id } = req.body;
        // Obtiene el formato de extension del archivo (ej: .jpg .png)
        const ext = path.extname(req.file.originalname).toLowerCase();
        // obtiene la ruta en la que el archivo se encuentra
        const imageTempPath = req.file.path;
        // controla y/o muestra si hubo errores al intentar subir la imagen
        const errors = [];
        //nombre de la imagen
        let imgURL = '';

        // Comprueba que el formato sea valido
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            // Comprueba que el tamaño sea menor o igual al soportado
            if (req.file.size <= 4194304) { // Menor a 4 Mega bytes
                // Obtiene los datos del usuario actual
                const player = await Player.findById(id);
                
                // si aun tiene la imagen por defecto
                if (player.image === 'default.png') {

                } else {
                    // Elimina la imagen anterior...
                    await fs.unlink(path.resolve('./src/public/upload/users/' + player.image)); // elimina el archivo del servidor
                }

                // generar un ID aleatorio
                imgURL = randomString();
                console.log('generando id imagen...' + imgURL);
                // Buscar el id de la imagen en la BD
                const match = await Player.findOne({ image: { $regex: imgURL } });
                if (match) {
                    saveImage(); // volver a intentar con ID distinto
                } else {
                    // Donde se moverá el archivo
                    const targetPath = path.resolve('src/public/upload/users/' + imgURL + ext);
                    // Intentar subir el archivo
                    await fs.rename(imageTempPath, targetPath, function (err) {
                        if (err) {
                            errors.push({ text: 'No se pudo subir la imagen al servidor.' });
                        }
                    });

                    if (errors.length === 0) {
                        const updated_at = Date.now();
                        player.image = imgURL + ext;
                        player.updated_at = updated_at;
                        await player.save(); // actualiza el nombre de la imagen
                    }
                }
            } else {
                errors.push({ text: 'El tamaño del archivo es muy grande (' + req.file.size + 'bytes)' });
            }
        } else {
            errors.push({ text: 'El formato de este archivo no es válido.' });
        }
        if (errors.length === 0) {
            res.send(imgURL + ext);
        } else {
            // borra los archivos temporales
            await fs.unlink(imageTempPath);
            res.send({ errors });
        }
    }
    saveImage();
});

module.exports = router;