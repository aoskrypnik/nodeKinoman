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
const FILMS_AMOUNT = 47946;
const moods = [{Name: 'Хороший'}, {Name: 'Поганий'}, {Name: 'Нормальний'}];

const movieArticles = []
client.getEntries()
    .then(function (entries) {
        // log the title for all the entries that have it
        entries.items.forEach(function (entry) {
            movieArticles.push({genre: parseInt(entry.fields.genre, 10), content: entry.fields.articleContent})
        })
    })

function getFilmsFromDb(filmsCount, searchQuery, genreCode, countryCode, callback) {
    if (searchQuery === null || searchQuery === undefined) {
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

    if (lastFilms.length === 0 || (pageName !== null && pageName !== lastPageName)) {
        getFilmsFromDb(5 * FILMS_PER_PAGE, searchQuery, genreCode, countryCode, function (response) {
            lastFilms = response;
            lastPageName = pageName;

            callback({
                pageName: pageName,
                pageNumber: page,
                totalPages: FILMS_AMOUNT / FILMS_PER_PAGE,
                films: lastFilms.slice(FILMS_PER_PAGE * parseInt(page), FILMS_PER_PAGE * (parseInt(page) + 1)),
            });
        });
    } else {
        callback({
            pageName: pageName,
            pageNumber: page,
            totalPages: FILMS_AMOUNT / FILMS_PER_PAGE,
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

    pool.execute(sqlQuery, function (err, filmRes) {
        if (err) {
            console.error(err);
            res.render('movie', {pageName: 'movie', movie: {}, pageTitle: undefined, metaDescription: undefined});
        }

        if (filmRes.length === 0) {
            res.status(404).send(`Film with id=${id} not found(`);
        }

        let meta = 'Фільм ' + filmRes[0].Title;

        pool.execute(`SELECT Name FROM Genres WHERE Id IN (SELECT GenreId FROM FilmGenres WHERE FilmId=${id})`,
            function (err, genresRes) {
                pool.execute(`SELECT Name FROM Countries WHERE Id IN (SELECT CountryId FROM FilmCountries WHERE FilmId=${id})`,
                    function (err, countriesRes) {
                        pool.execute(`SELECT Name FROM Studios WHERE Id IN (SELECT StudioId FROM FilmStudios WHERE FilmId=${id})`,
                            function (err, studiosRes) {
                                res.render('movie', {
                                    pageName: 'movie',
                                    movie: filmRes[0],
                                    pageTitle: filmRes[0].Title,
                                    genres: genresRes,
                                    countries: countriesRes,
                                    studios: studiosRes,
                                    metaDescription: meta
                                });
                            });
                    });
            });
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
    res.render('index', {pageName: 'kinoman', pageTitle: undefined, metaDescription: undefined});
});

server.get('/comedy', function (req, res) {
    const genreCode = 6
    getFilmsOnPage('comedy', req.query.page, null, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('comedy', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно комедії',
            pageName: 'comedy',
            metaDescription: 'Ця сторінка про фільми жанр комедія, сміх'
        });
    });
});

server.get('/romantic', function (req, res) {
    const genreCode = 31
    getFilmsOnPage('romantic', req.query.page, null, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('romantic', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно про кохання',
            pageName: 'romantic',
            metaDescription: 'Ця сторінка про фільми жанр романтика, любов'
        });
    });
});

server.get('/thriller', function (req, res) {
    const genreCode = 10
    getFilmsOnPage('thriller', req.query.page, null, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('thriller', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно трилери',
            pageName: 'thriller',
            metaDescription: 'Ця сторінка про фільми жанр трилер, бойовик'
        });
    });
});

server.get('/ukrainian', function (req, res) {
    const countryCode = 29
    getFilmsOnPage('ukrainian', req.query.page, null, null, countryCode, function (response) {
        const articleContent = movieArticles.find(article => article.genre === countryCode).content
        res.render('ukrainian', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'сучасне українське кіно',
            pageName: 'ukrainian',
            metaDescription: 'Ця сторінка про фільми українське кіно'
        });
    });
});

server.get('/zombie', function (req, res) {
    const genreCode = 89
    getFilmsOnPage('zombie', req.query.page, null, genreCode, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('zombie', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно про зомбі',
            pageName: 'zombie',
            metaDescription: 'Ця сторінка про фільми жанр зомбі'
        });
    });
});

server.get('/films', function (req, res) {
    const genreCode = 0
    getFilmsOnPage('zombie', req.query.page, null, null, null, function (response) {
        const articleContent = movieArticles.find(article => article.genre === genreCode).content
        res.render('films', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно під настрій',
            pageName: 'films',
            metaDescription: 'Ця сторінка про фільми під настрій'
        });
    });
});

server.get('/selection', function (req, res) {
    console.log("mood " + req.query.mood);
    if (req.query.yearMin === null || req.query.yearMin === undefined || req.query.yearMin === '' || req.query.yearMin === 'undefined') {
        req.query.yearMin = 0;
    }
    if (req.query.yearMax === null || req.query.yearMax === undefined || req.query.yearMax === '' || req.query.yearMax === 'undefined') {
        req.query.yearMax = 2021;
    }
    if (req.query.ratingMin === null || req.query.ratingMin === undefined || req.query.ratingMin === '' || req.query.ratingMin === 'undefined') {
        req.query.ratingMin = 5;
    }

    let sqlQuery =
        `SELECT * ` +
        `FROM Films ` +
        `WHERE Year >= ${req.query.yearMin} AND ` +
        `      Year <= ${req.query.yearMax} AND ` +
        `      ImdbRating >= ${req.query.ratingMin} `;

    if (req.query.country !== null && req.query.country !== undefined && req.query.country !== '' && req.query.country !== 'undefined') {
        sqlQuery +=
            `AND Id IN (SELECT FilmId ` +
            `           FROM FilmCountries ` +
            `           WHERE CountryId = ${req.query.country}) `;
    }
    if (req.query.genre !== null && req.query.genre !== undefined && req.query.genre !== '' && req.query.genre !== 'undefined') {
        sqlQuery +=
            `AND Id IN (SELECT FilmId ` +
            `           FROM FilmGenres ` +
            `           WHERE GenreId = ${req.query.genre}) `;
    }

    sqlQuery+=
        `ORDER BY RAND() ` +
        `LIMIT 6 `;

    console.log(sqlQuery);

    pool.execute(sqlQuery, function (err, results) {
        if (err) {
            console.error(err);
            res.send('not found');
        }

        res.render('partials/filmList', {films: results}, function (err, html) {
            if (err) {
                return res.sendStatus(500);
            }
            res.send(html);
        });
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
            res.render('selection', {
                pageName: 'selection',
                pageTitle: 'пошук фільм',
                metaDescription: 'Ця сторінк дозволяє знайти фільм за жанр, країна, рейтнг',
                countries: countries,
                genres: genres,
                moods: moods
            });
        });
    });
});

server.get('*', function (req, res) {
    res.status(404).send('what???');
});
