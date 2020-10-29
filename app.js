const express = require('express');
const server = express();
const request = require('request');
const mysql = require("mysql2");

const pool = mysql.createPool({
    connectionLimit: 5,
    host: "91.239.233.90",
    database: "xfinklcm_KinoteatrFilms",
    user: "xfinklcm_films_admin",
    password: "G]g~f7gVz^>])@8#"
});

server.set('view engine', 'ejs');
server.listen(8888);
server.use(express.static(__dirname + "/public"));

const kinoTeatrApi = 'https://api.kino-teatr.ua/rest';

const FILMS_PER_PAGE = 6;

function getFilms(page, genreCode, countryCode, callback) {
    if (page === null || page === undefined) {
        page = 0;
    }

    let sqlQuery =
        `SELECT * ` +
        `FROM Films `;
    if (genreCode !== null && genreCode !== undefined) {
        sqlQuery +=
            `WHERE Id IN (SELECT FilmId ` +
            `             FROM FilmGenres ` +
            `             WHERE GenreId = ${genreCode}) `;
    }
    if (countryCode !== null && countryCode !== undefined) {
        sqlQuery += genreCode !== null && genreCode !== undefined ? 'AND ' : 'WHERE ';
        sqlQuery +=
            `Id IN (SELECT FilmId ` +
            `       FROM FilmCountries ` +
            `       WHERE CountryId = ${countryCode}) `;
    }

    sqlQuery += `LIMIT ${FILMS_PER_PAGE} OFFSET ${page * FILMS_PER_PAGE} `;

    pool.execute(sqlQuery, function (err, results) {
        if (err) {
            console.error(err);
            callback({films: []});
        }

        let responseObj = {
            pageNumber: page,
            totalPages: 47946 / FILMS_PER_PAGE,
            films: results
        };

        callback(responseObj);
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

server.get('/pageable', function (req, res) {
    console.log("Called pageable");
    console.log(req.query.genreCode);
    console.log(req.query.countryCode);
    getFilms(req.query.pageNum, req.query.genreCode, req.query.countryCode, function (response) {
        res.render('partials/filmList', {pageName: 'films', ...response}, function (err, html) {
            if (err) return res.sendStatus(500);
            res.send(html);
        });
    });
});

server.get('/', function (req, res) {
    res.render('index', {pageName: 'kinoman'});
});

server.get('/comedy', function (req, res) {
    getFilms(req.query.page, 6, null, function (response) {
        res.render('comedy', {pageName: 'comedy', ...response});
    });
});

server.get('/romantic', function (req, res) {
    getFilms(req.query.page, 31, null, function (response) {
        res.render('romantic', {pageName: 'romantic', ...response});
    });
});

server.get('/thriller', function (req, res) {
    getFilms(req.query.page, 10, null, function (response) {
        res.render('thriller', {pageName: 'thriller', ...response});
    });
});

server.get('/ukrainian', function (req, res) {
    getFilms(req.query.page, null, 29, function (response) {
        res.render('ukrainian', {pageName: 'ukrainian', ...response});
    });
});

server.get('/zombie', function (req, res) {
    getFilms(req.query.page, 89, null, function (response) {
        res.render('zombie', {pageName: 'zombie', ...response});
    });
});

server.get('/films', function (req, res) {
    getFilms(req.query.page, null, null, function (response) {
        res.render('films', {pageName: 'films', ...response});
    });
});

server.get('*', function (req, res) {
    res.status(404).send('what???');
});
