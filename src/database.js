const mongoose = require('mongoose');
// var env = require('dotenv').config();

//Local
// mongoose.connect('mongodb://localhost/shooter-db', {

// Server in Heroku....
mongoose.connect('mongodb+srv://Wargosh:Wargosh30@cluster0-0vnzr.mongodb.net/test?retryWrites=true&w=majority', {

        // Server in azure....
        //mongoose.connect('mongodb://shooter-db:MeUCwsgAkQ4hprG1KKSLQPetBWKQRzCTyB9Buf4tUGrcJcq9yAoEZHLj9PTqKLzP2AIciPg2tm1rpBPkFBJg6g==@shooter-db.mongo.cosmos.azure.com:10255/shooter-db?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@shooter-db@', {

        useCreateIndex: true,
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(db => console.log('DB is connected!'))
    .catch(err => console.log(err));
/*
// Server in azure....
    mongoose.connect("mongodb://" + process.env.COSMOSDB_HOST + ":" + process.env.COSMOSDB_PORT + "/" + process.env.COSMOSDB_DBNAME + "?ssl=true&replicaSet=globaldb", {
        auth: {
            user: process.env.COSMODDB_USER,
            password: process.env.COSMOSDB_PASSWORD
        }
    })
    .then(() => console.log('DB is connected!'))
    .catch((err) => console.error(err));*/