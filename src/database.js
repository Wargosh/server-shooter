const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/shooter-db', { // local

        // Server in Heroku....
        // mongoose.connect('mongodb+srv://Wargosh:Wargosh30@cluster0-0vnzr.mongodb.net/test?retryWrites=true&w=majority', {

        // Server in azure....
        //

        useCreateIndex: true,
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    })
    .then(db => console.log('DB is connected!'))
    .catch(err => console.log(err));