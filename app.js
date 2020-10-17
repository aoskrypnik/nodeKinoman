const express = require('express');
const server = express();
const request = require('request');

server.set('view engine', 'ejs');
server.listen(8888);
server.use(express.static(__dirname + "/public"));

server.get('/movie', function (req, res) {
    let id = req.query.id;
    request(`https://api.kino-teatr.ua/rest/film/${id}?apiKey=skrypnikukmaeduua&size=10`, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let movie = JSON.parse(body);
            res.render('movie', {pageName: 'movie', movie: movie});
        } else {
            res.render('movie', {pageName: 'movie', movie: {}});
        }
    });
});

server.get('/', function (req, res) {
    res.render('index', {pageName: 'kinoman'});
});

server.get('/comedy', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?genre=6&apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('comedy', {pageName: 'comedy', films: films});
        } else {
            res.render('comedy', {pageName: 'comedy', films: []});
        }
    });
});

server.get('/romantic', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?genre=31&apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('romantic', {pageName: 'romantic', films: films});
        } else {
            res.render('romantic', {pageName: 'romantic', films: []});
        }
    });
});

server.get('/thriller', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?genre=10&apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('thriller', {pageName: 'thriller', films: films});
        } else {
            res.render('thriller', {pageName: 'thriller', films: []});
        }
    });
});

server.get('/ukrainian', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?country=29&apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('ukrainian', {pageName: 'ukrainian', films: films});
        } else {
            res.render('ukrainian', {pageName: 'ukrainian', films: []});
        }
    });
});

server.get('/zombie', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?genre=89&apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('zombie', {pageName: 'zombie', films: films});
        } else {
            res.render('zombie', {pageName: 'zombie', films: []});
        }
    });
});

server.get('/films', function (req, res) {
    request('https://api.kino-teatr.ua/rest/films?apiKey=skrypnikukmaeduua&size=10', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let films = JSON.parse(body).content;
            res.render('films', {pageName: 'films', films: films});
        } else {
            res.render('films', {pageName: 'films', films: []});
        }
    });
});

server.get('*', function(req, res){
    res.send('what???', 404);
});
