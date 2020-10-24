const express = require('express');
const server = express();
const request = require('request');

server.set('view engine', 'ejs');
server.listen(8888);
server.use(express.static(__dirname + "/public"));

const kinoTeatrApi = 'https://api.kino-teatr.ua/rest';

function getFilms(page, ganreCode, countryCode, callback) {
    let requestUrl = `${kinoTeatrApi}/films?apiKey=skrypnikukmaeduua`;
    if (page !== null && page !== undefined) {
        requestUrl += `&page=${page}`;
    }
    if (ganreCode !== null) {
        requestUrl += `&genre=${ganreCode}`;
    }
    if (countryCode !== null) {
        requestUrl += `&country=${countryCode}`;
    }

    request(requestUrl, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            let jsonBody = JSON.parse(body);
            let responseObj = {
                pageNumber: jsonBody.number,
                totalPages: jsonBody.totalPages,
                films: jsonBody.content
            };
            callback(responseObj);
        } else {
            let responseObj = {films: []};
            callback(responseObj);
        }
    });
}

server.get('/movie', function (req, res) {
    let id = req.query.id;
    request(`${kinoTeatrApi}/film/${id}?apiKey=skrypnikukmaeduua`, function (error, response, body) {
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
    getFilms(req.query.page, 6, null, function(response) {
        res.render('comedy', {pageName: 'comedy', ...response});
    });
});

server.get('/romantic', function (req, res) {
    getFilms(req.query.page, 31, null, function(response) {
        res.render('romantic', {pageName: 'romantic', ...response});
    });
});

server.get('/thriller', function (req, res) {
    getFilms(req.query.page, 10, null, function(response) {
        res.render('thriller', {pageName: 'thriller', ...response});
    });
});

server.get('/ukrainian', function (req, res) {
    getFilms(req.query.page, null, 29, function(response) {
        res.render('ukrainian', {pageName: 'ukrainian', ...response});
    });
});

server.get('/zombie', function (req, res) {
    getFilms(req.query.page, 89, null, function(response) {
        res.render('zombie', {pageName: 'zombie', ...response});
    });
});

server.get('/films', function (req, res) {
    getFilms(req.query.page, null, null, function(response) {
        res.render('films', {pageName: 'films', ...response});
    });
});

server.get('*', function(req, res){
    res.send('what???', 404);
});
