const express = require('express');
const server = express();
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

const FILMS_PER_PAGE = 6;
const moods = [{Name: 'Хороший'}, {Name: 'Поганий'}, {Name: 'Нормальний'}];

function getFilmsFromDb(filmsCount, searchQuery, genreCode, countryCode, callback) {
    if(searchQuery === null || searchQuery === undefined) {
        searchQuery = "";
    }

    let sqlQuery =
        `SELECT * ` +
        `FROM Films ` +
        `WHERE Title LIKE '%${searchQuery}%' `;

    if (genreCode !== null && genreCode !== undefined) {
        sqlQuery +=
            `AND Id IN (SELECT FilmId ` +
            `           FROM FilmGenres ` +
            `           WHERE GenreId = ${genreCode}) `;
    }
    if (countryCode !== null && countryCode !== undefined) {
        sqlQuery +=
            `AND Id IN (SELECT FilmId ` +
            `           FROM FilmCountries ` +
            `           WHERE CountryId = ${countryCode}) `;
    }

    sqlQuery +=
        `ORDER BY RAND() ` +
        `LIMIT ${filmsCount} `;

    pool.execute(sqlQuery, function (err, results) {
        if (err) {
            console.error(err);
            callback({films: []});
        }

        callback(results);
    });
}

let lastPageName = "";
let lastFilms = [];
function getFilmsOnPage(pageName, page, searchQuery, genreCode, countryCode, callback) {
    if (page === null || page === undefined) {
        page = 0;
    }

    if (lastFilms.length === 0 || (pageName !== null && pageName !== lastPageName )) {
        getFilmsFromDb(5 * FILMS_PER_PAGE, searchQuery, genreCode, countryCode, function (response) {
            lastFilms = response;
            lastPageName = pageName;

            callback({
                pageName: pageName,
                pageNumber: page,
                totalPages: 47946 / FILMS_PER_PAGE,
                films: lastFilms.slice(FILMS_PER_PAGE * parseInt(page), FILMS_PER_PAGE * (parseInt(page) + 1)),
            });
        });
    } else {
        callback({
            pageName: pageName,
            pageNumber: page,
            totalPages: 47946 / FILMS_PER_PAGE,
            films: lastFilms.slice(FILMS_PER_PAGE * parseInt(page), FILMS_PER_PAGE * (parseInt(page) + 1)),
        });
    }
}

server.get('/search', function (req, res) {
    getFilmsOnPage('search', req.query.page, req.query.filmName, null, null, function (response) {
        res.json(response);
    });
});

server.get('/movie', function (req, res) {
    let id = req.query.id;
    let sqlQuery =
        `SELECT * ` +
        `FROM Films ` +
        `WHERE Id = ${id}`;

    pool.execute(sqlQuery, function (err, results) {
        if (err) {
            console.error(err);
            res.render('movie', {pageName: 'movie', movie: {}});
        }

        if (results.length === 0) {
            res.status(404).send(`Film with id=${id} not found(`);
        }

        res.render('movie', {pageName: 'movie', movie: results[0]});
    });
});

// Pagination
server.get('/pageable', function (req, res) {
    getFilmsOnPage(null, req.query.pageNum, null, null, null, function (response) {
        res.render('partials/filmList', response, function (err, html) {
            if (err) {
                return res.sendStatus(500);
            }
            res.send(html);
        });
    });
});

server.get('/', function (req, res) {
    res.render('index', {pageName: 'kinoman'});
});

server.get('/comedy', function (req, res) {
    getFilmsOnPage('comedy', req.query.page, null, 6, null, function (response) {
        res.render('comedy', response);
    });
});

server.get('/romantic', function (req, res) {
    getFilmsOnPage('romantic', req.query.page, null, 31, null, function (response) {
        res.render('romantic', response);
    });
});

server.get('/thriller', function (req, res) {
    getFilmsOnPage('thriller', req.query.page, null, 10, null, function (response) {
        res.render('thriller', response);
    });
});

server.get('/ukrainian', function (req, res) {
    getFilmsOnPage('ukrainian', req.query.page, null, null, 29, function (response) {
        res.render('ukrainian', response);
    });
});

server.get('/zombie', function (req, res) {
    getFilmsOnPage('zombie', req.query.page, null, 89, null, function (response) {
        res.render('zombie', response);
    });
});

server.get('/films', function (req, res) {
    getFilmsOnPage('films', req.query.page, null, null, null, function (response) {
        res.render('films', response);
    });
});

server.get('/selection', function (req, res) {
    if (req.query.yearMin === null || req.query.yearMin === undefined || req.query.yearMin === '') {
        req.query.yearMin = 0;
    }
    if (req.query.yearMax === null || req.query.yearMax === undefined || req.query.yearMax === '') {
        req.query.yearMax = 2021;
    }
    if (req.query.ratingMax === null || req.query.ratingMax === undefined || req.query.ratingMax === '') {
        req.query.ratingMax = 0;
    }

    let sqlQuery =
        `SELECT * ` +
        `FROM Films ` +
        `WHERE Year >= ${req.query.yearMin} AND ` +
        `      Year <= ${req.query.yearMax} AND ` +
        `      ImdbRating >= ${req.query.ratingMax} ` +
        `ORDER BY TotalShows DESC`;

    console.log(sqlQuery);

    pool.execute(sqlQuery, function (err, results) {
        if (err) {
            console.error(err);
            res.render('selection', {pageName: 'selection', movie: {}});
        }

        res.render('selection', {pageName: 'movie', films: results});
    });
});

server.get('/selection/form', function (req, res) {
    let countriesPromise = new Promise(function (resolve, reject) {
        pool.execute(`SELECT * FROM Countries`, function (err, results) {
            if (err) reject.error(err);
            resolve(results);
        });
    });

    countriesPromise.then(function (countries) {
        let genresPromise = new Promise(function (resolve, reject) {
            pool.execute(`SELECT * FROM Genres`, function (err, results) {
                if (err) reject.error(err);
                resolve(results);
            });
        });

        genresPromise.then(function (genres) {
            res.render('selection', {pageName: 'selection', countries: countries, genres: genres, moods: moods});
        });
    });
});

server.get('*', function (req, res) {
    res.status(404).send('what???');
});
