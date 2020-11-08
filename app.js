// import { documentToHtmlString } from '@contentful/rich-text-html-renderer';

const html_renderer = require("@contentful/rich-text-html-renderer");
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
});

server.set('view engine', 'ejs');
server.listen(8888);
server.use(express.static(__dirname + "/public"));

const FILMS_PER_PAGE = 6;
const FILMS_AMOUNT = 47946;
const moods = [{Name: 'Хороший'}, {Name: 'Поганий'}, {Name: 'Нормальний'}];

const movieArticles = [];
client.getEntries()
    .then(function (entries) {
        // log the title for all the entries that have it
        entries.items.forEach(function (entry) {
            movieArticles.push({genre: parseInt(entry.fields.genre, 10), content: entry.fields.articleRichContent})
        })
    });

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
    if (page === null || page === undefined || page < 1 || page > 5) {
        page = 0;
    } else {
        page = page - 1;
    }

    if (lastFilms.length === 0 || (pageName !== null && pageName !== lastPageName) || pageName === 'search') {
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
                                    canonicalLink: null,
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

server.get('/', function (req, res) {
    getFilmsOnPage(null, 0, null, null, null, function (response) {
        res.render('index', {
            pageName: 'kinoman',
            pageTitle: undefined,
            metaDescription: undefined,
            canonicalLink: null,
            films: response.films
        });
    });
});

server.get('/search', function (req, res) {
    getFilmsFromDb(100, req.query.filmName, null, null, function (response) {
        res.render('search', {
            articleContent: '',
            films: response,
            pageTitle: 'пошук фільму',
            pageName: 'search',
            canonicalLink: null,
            metaDescription: 'Ввести назву фільму',
            searchQuery: req.query.filmName,
        });
    });
});

server.get('/comedy/:pageNum?', function (req, res) {
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/comedy');
        return;
    }
    const genreCode = 6;
    getFilmsOnPage('comedy', req.params.pageNum, null, genreCode, null, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode).content);
        res.render('comedy', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно комедії',
            pageName: 'comedy',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/comedy' : null,
            active: response.pageNumber + 1,
            metaDescription: 'Комедії, що варто подивитись, легке кіно та класні комедії на сервісі Kinoman',
        });
    });
});

server.get('/romantic/:pageNum?', function (req, res) {
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/romantic');
        return;
    }
    const genreCode = 31;
    getFilmsOnPage('romantic', req.params.pageNum, null, genreCode, null, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode).content);
        res.render('romantic', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'Кіно про кохання, мелодрами, фільми про любов. Сервіс підбору Kinoman',
            pageName: 'romantic',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/romantic' : null,
            active: response.pageNumber + 1,
            metaDescription: 'Підбірка романтичних фільмів про кохання. Сервіс підбору фільмів про любов Kinoman',
        });
    });
});

server.get('/thriller/:pageNum?', function (req, res) {
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/thriller');
        return;
    }
    const genreCode = 10;
    getFilmsOnPage('thriller', req.params.pageNum, null, genreCode, null, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode).content);
        res.render('thriller', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно бойовик',
            pageName: 'thriller',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/thriller' : null,
            active: response.pageNumber + 1,
            metaDescription: 'Найкращі бойовики та трилери на сервісі підбору фільмів Kinoman',
        });
    });
});

server.get('/ukrainian/:pageNum?', function (req, res) {
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/ukrainian');
        return;
    }
    const countryCode = 29;
    getFilmsOnPage('ukrainian', req.params.pageNum, null, null, countryCode, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === countryCode).content);
        res.render('ukrainian', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'Українські фільми на сервісі підбору фільмів Kinoman',
            pageName: 'ukrainian',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/ukrainian' : null,
            active: response.pageNumber + 1,
            metaDescription: 'Підбірка кращих українських фільмів та сучасного українського кіно. Сервіс підбору фільмів Kinoman',
        });
    });
});

server.get('/zombie', function (req, res) {
    const genreCode = 89;
    getFilmsOnPage('zombie', req.params.pageNum, null, genreCode, null, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode).content);
        res.render('zombie', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'кіно зомбі',
            pageName: 'zombie',
            canonicalLink: null,
            metaDescription: 'Фільми про зомбі. Кращі фільми про зомбаків. Сервіс підбору фільмів Kinoman'
        });
    });
});

server.get('/films/:pageNum?', function (req, res) {
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/films');
        return;
    }
    const genreCode = 0;
    getFilmsOnPage('zombie', req.params.pageNum, null, null, null, function (response) {
        const articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode).content);
        res.render('films', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: 'Фільми для гарного настрою, підбірка фільмів на сервісі Kinoman',
            pageName: 'films',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/films' : null,
            active: response.pageNumber + 1,
            metaDescription: 'Фільми на вечір для гарного настрою, підбірка класних фільмів на сервісі Kinoman'
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

    sqlQuery +=
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
                canonicalLink: null,
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
