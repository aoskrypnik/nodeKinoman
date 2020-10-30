const express = require('express');
const server = express();
const mysql = require("mysql2");
const contentful = require('contentful');

const pool = mysql.createPool({
    connectionLimit: 5,
    host: "91.239.233.90",
    database: "xfinklcm_KinoteatrFilms",
    user: "xfinklcm_films_admin",
    password: "G]g~f7gVz^>])@8#"
});

const client = contentful.createClient({
    space: "y6sq3k0yxixi",
    accessToken: "G1E1yZc6ZijRbL0fiPMpPTWXvlyjxLC4L_Ki9lopZuQ"
})

server.set('view engine', 'ejs');
server.listen(8888);
server.use(express.static(__dirname + "/public"));

const FILMS_PER_PAGE = 6;
const moods = [{Name: 'Хороший'}, {Name: 'Поганий'}, {Name: 'Нормальний'}];

const movieArticles = []
client.getEntries()
    .then(function (entries) {
        // log the title for all the entries that have it
        entries.items.forEach(function (entry) {
            movieArticles.push({genre: parseInt(entry.fields.genre, 10), content: entry.fields.articleContent})
        })
    })


function getFilmsFromDb(filmsCount, genreCode, countryCode, callback) {
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
function getFilmsOnPage(pageName, page, genreCode, countryCode, callback) {
    if (page === null || page === undefined) {
        page = 0;
    }

    if (lastFilms.length === 0 || (pageName !== null && pageName !== lastPageName )) {
        getFilmsFromDb(5 * FILMS_PER_PAGE, genreCode, countryCode, function (response) {
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
    res.json({name: req.query.filmName});
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
    getFilmsOnPage(null, req.query.pageNum, null, null, function (response) {
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
    const genreCode = 6
    getFilmsOnPage('comedy', req.query.page, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('comedy', { articleContent: articleContent, ...response });
    });
});

server.get('/romantic', function (req, res) {
    const genreCode = 31
    getFilmsOnPage('romantic', req.query.page, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('romantic', { articleContent: articleContent, ...response });
    });
});

server.get('/thriller', function (req, res) {
    const genreCode = 10
    getFilmsOnPage('thriller', req.query.page, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('thriller', { articleContent: articleContent, ...response });
    });
});

server.get('/ukrainian', function (req, res) {
    const countryCode = 29
    getFilmsOnPage('ukrainian', req.query.page, null, 29, function (response) {
        const articleContent = movieArticles.find(article => article.genre === countryCode).content
        res.render('ukrainian', { articleContent: articleContent, ...response });
    });
});

server.get('/zombie', function (req, res) {
    const genreCode = 89
    getFilmsOnPage('zombie', req.query.page, 89, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('zombie', response);
    });
});

server.get('/films', function (req, res) {
    getFilmsOnPage('films', req.query.page, null, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === 0).content
        res.render('films', response);
    });
});

server.get('/selection', function (req, res) {
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
            console.log(countries);
            console.log(genres);
            console.log(moods);
            res.render('selection', {pageName: 'selection', countries: countries, genres: genres, moods: moods});
        });
    });
});

server.get('*', function (req, res) {
    res.status(404).send('what???');
});
