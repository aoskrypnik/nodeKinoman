// import { documentToHtmlString } from '@contentful/rich-text-html-renderer';

const html_renderer = require("@contentful/rich-text-html-renderer");
const express = require('express');
const server = express();
const mysql = require("mysql2");
const session = require('express-session');
const cookieParser = require('cookie-parser');
const i18n = require('i18n');
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

server.use(cookieParser("i18n_demo"));
server.use(session({
    secret: "i18n_demo",
    resave: true,
    saveUninitialized: true,
    cookie: {maxAge: 60000}
}));
i18n.configure({
    locales: ['ru', 'ua'],
    directory: __dirname + '/locales',
    defaultLocale: 'ru',
    cookie: 'i18n'
});
server.use(i18n.init);
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
            movieArticles.push({
                genre: parseInt(entry.fields.genre, 10),
                content: entry.fields.articleRichContent,
                isUkrainian: entry.fields.isUkrainian
            })
        })
    });

function getFilmsFromDb(filmsCount, searchQuery, genreCode, countryCode, res, callback) {
    if (searchQuery === null || searchQuery === undefined) {
        searchQuery = "";
    }

    let sqlQuery;
    if (res === null || res.locale === 'ua') {
        sqlQuery =
            `SELECT * ` +
            `FROM Films ` +
            `WHERE Title LIKE '%${searchQuery}%' `;
    } else {
        sqlQuery =
            `SELECT * ` +
            `FROM Films ` +
            `WHERE TitleRu LIKE '%${searchQuery}%' `;
    }

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
    if (page === null || page === undefined || isNaN(page) || page < 1 || page > 5) {
        page = 0;
    } else {
        page = page - 1;
    }

    if (lastFilms.length === 0 || (pageName !== null && pageName !== lastPageName) || pageName === 'search') {
        getFilmsFromDb(5 * FILMS_PER_PAGE, searchQuery, genreCode, countryCode, null, function (response) {
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

server.get('/makeUa', function (req, res) {
    if (i18n.getLocale(req) === 'ua') {
        res.redirect(req.headers.referer);
    } else {
        res.cookie('i18n', 'ua');
        res.setLocale("ua");
        let referer = req.headers.referer;
        if (referer.includes('?')) {
            let index = referer.indexOf('?');
            res.redirect(referer.substring(0, index) + '/ua' + referer.substring(index));
        } else {
            if (referer[referer.length - 1] === '/')
                res.redirect(req.headers.referer + 'ua');
            else
                res.redirect(req.headers.referer + '/ua');
        }
    }
});

server.get('/makeRu', function (req, res) {
    if (i18n.getLocale(req) === 'ru') {
        res.redirect(req.headers.referer);
    } else {
        res.cookie('i18n', 'ru');
        res.setLocale("ru");
        let referer = req.headers.referer;

        if (referer.includes('/ua')) {
            let index = referer.indexOf('/ua');
            res.redirect(referer.substring(0, index) + referer.substring(index + 3));
        } else {
            res.redirect(referer);
        }
    }
});

server.get('/movie/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    let id = req.query.id;
    let sqlQuery =
        `SELECT * ` +
        `FROM Films ` +
        `WHERE Id = ${id}`;

    pool.execute(sqlQuery, function (err, filmRes) {
        if (err) {
            console.error(err);
            res.render('movie', {
                pageName: 'movie',
                movie: {},
                pageTitle: undefined,
                metaDescription: undefined,
                curLocale: curLocale,
                i18n: res
            });
        }

        if (filmRes.length === 0) {
            res.status(404).send(`Film with id=${id} not found(`);
            return;
        }

        let meta = "";
        if (res.locale === "ru" && filmRes[0] !== undefined) {
            meta = "Фильм " + filmRes[0].TitleRu + " - смотреть онлайн детальную информацию про фильм: продолжительность, год выпуска, рейтинг, бюджет, жанры, страна производства и описание";
        } else if (res.locale === "ua" && filmRes[0] !== undefined) {
            meta = "Фільм " + filmRes[0].Title + " - дивитись онлайн детальну інформацію про фільм: тривалість, рік випуску, рейтинг, бюджет, жанр, країна виробництва та опис";
        }
        pool.execute(`SELECT Name, NameRu FROM Genres WHERE Id IN (SELECT GenreId FROM FilmGenres WHERE FilmId=${id})`,
            function (err, genresRes) {
                pool.execute(`SELECT Name, NameRu FROM Countries WHERE Id IN (SELECT CountryId FROM FilmCountries WHERE FilmId=${id})`,
                    function (err, countriesRes) {
                        pool.execute(`SELECT Name FROM Studios WHERE Id IN (SELECT StudioId FROM FilmStudios WHERE FilmId=${id})`,
                            function (err, studiosRes) {
                                let movie = filmRes[0];
                                if (res.locale === 'ru') {
                                    genresRes.forEach(genre => genre.Name = genre.NameRu);
                                    countriesRes.forEach(country => country.Name = country.NameRu);
                                    movie.Title = movie.TitleRu;
                                    movie.Description = movie.DescriptionRu;
                                }
                                res.render('movie', {
                                    pageName: 'movie',
                                    canonicalLink: null,
                                    movie: movie,
                                    pageTitle: filmRes[0] === undefined ? ('not found ' + id) : filmRes[0].Title,
                                    genres: genresRes,
                                    countries: countriesRes,
                                    studios: studiosRes,
                                    metaDescription: meta,
                                    curLocale: curLocale,
                                    i18n: res
                                });
                            });
                    });
            });
    });
});

server.get('/', function (req, res) {
    res.cookie('i18n', 'ru');
    res.setLocale("ru");
    getFilmsFromDb(6, null, null, null, null, function (response) {
        response.forEach(film => {
            film.Title = film.TitleRu;
            film.Description = film.DescriptionRu;
        });
        pageTitle = "Киноман – сервис подбора и рекомендаций фильмов, лучшее кино";
        metaDescription = "Сайт Киноман предоставляет удобный сервис подбора фильмов под настроение, по жанрам, по странам и рейтингу";
        res.render('index', {
            pageName: 'kinoman',
            pageTitle: pageTitle,
            metaDescription: metaDescription,
            canonicalLink: null,
            films: response,
            curLocale: 'ru',
            i18n: res
        });
    });
});

server.get('/ua', function (req, res) {
    res.cookie('i18n', 'ua');
    res.setLocale("ua");
    getFilmsFromDb(6, null, null, null, null, function (response) {
        let pageTitle = "Кіноман - сервіс підбору та рекомендацій по фільмам";
        let metaDescription = "Сайт Кіноман надає зручний сервіс підбору фільмів під настрій та за іншими параметрами, а також загальні підбірки фільмів по жанрам";
        res.render('index', {
            pageName: 'kinoman',
            pageTitle: pageTitle,
            metaDescription: metaDescription,
            canonicalLink: null,
            films: response,
            curLocale: 'ua',
            i18n: res
        });
    });
});

server.get('/search', function (req, res) {
    let curLocale = i18n.getLocale(req);
    getFilmsFromDb(100, req.query.filmName, null, null, res, function (response) {
        let pageTitle = 'Пошук фільму - швидкий і зручний підбір фільму за заданими параметрами';
        let metaDescription = 'Використайте алгоритм підбору фільмів сайту Кіноман та з легкістю підберіть фільм під ваш настрій та інші параметри';
        if (res.locale === 'ru') {
            response.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            pageTitle = "Поиск фильма – быстрый и удобный подбор фильмов по заданным параметрам";
            metaDescription = "Используйте алгоритм подбора фильмов сайта Киноман, и с легкостью выберите фильм под ваше настроение и желаемый жанр";
        }
        res.render('search', {
            articleContent: '',
            films: response,
            pageTitle: pageTitle,
            pageName: 'search',
            canonicalLink: null,
            metaDescription: metaDescription,
            searchQuery: req.query.filmName,
            curLocale: curLocale,
            i18n: res
        });
    });
});

function getCurLocale(req, res) {
    let lang = req.params.pageNum === 'ua' ? 'ua' : req.params.lang;

    if (lang === 'ua' && i18n.getLocale(req) !== 'ua') {
        res.cookie('i18n', 'ua');
        res.setLocale("ua");
    }
    if ((lang === undefined || lang === null) && i18n.getLocale(req) !== 'ru') {
        res.cookie('i18n', 'ru');
        res.setLocale("ru");
    }

    return i18n.getLocale(res);
}

server.get('/comedy/:pageNum?/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);

    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/comedy');
        return;
    }
    const genreCode = 6;
    getFilmsOnPage('comedy', req.params.pageNum, null, genreCode, null, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === true).content);
        let pageTitle = 'Кіно комедії: онлайн підбірка та рекомендації кращих фільмів жанру';
        let metaDescription = 'Переглядайте підбірку фільмів жанру комедія на сайті Кіноман. Вона створена нами та містить кращих представників категорії ';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === false).content);
            pageTitle = "Кино комедии: онлайн подборка и рекомендации лучших комедийных фильмов";
            metaDescription = "Смотрите подборку фильмов жанра комедия на сайте Киноман. Лучшие фильмы жанра комедия для получения позитива."
        }
        res.render('comedy', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'comedy',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/comedy' : null,
            active: response.pageNumber + 1,
            metaDescription: metaDescription,
            curLocale: curLocale,
            linkName: 'comedy',
            i18n: res
        });
    });
});

server.get('/romantic/:pageNum?/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/romantic');
        return;
    }
    const genreCode = 31;
    getFilmsOnPage('romantic', req.params.pageNum, null, genreCode, null, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === true).content);
        let pageTitle = 'Кіно про кохання: онлайн підбірка та рекомендації кращих фільмів жанру';
        let metaDescription = 'Переглядайте підбірку романтичних фільмів про кохання на сайті Кіноман. Вона створена нами та містить кращих представників категорії ';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === false).content);
            pageTitle = "Кино про любовь: онлайн подборка романтического жанра";
            metaDescription = "Смотрите подборку романтических фильмов про любовь на сайте Киноман. Она создана нами и гарантирует лучшие фильмы";
        }
        res.render('romantic', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'romantic',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/romantic' : null,
            active: response.pageNumber + 1,
            metaDescription: metaDescription,
            curLocale: curLocale,
            linkName: 'romantic',
            i18n: res
        });
    });
});

server.get('/thriller/:pageNum?/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/thriller');
        return;
    }
    const genreCode = 10;
    getFilmsOnPage('thriller', req.params.pageNum, null, genreCode, null, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === true).content);
        let pageTitle = 'Кіно бойовики: онлайн підбірка та рекомендації кращих фільмів жанру';
        let metaDescription = 'Переглядайте підбірку фільмів жанру бойовик та трилер на сайті Кіноман. Вона створена нами та містить кращих представників категорії ';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === false).content);
            pageTitle = "Кино боевики: онлайн подборка лучших фильмов жанра триллер";
            metaDescription = "Просмотрите подборку фильмов жанра боевик и трилер на сайте Киноман. Она создана нами и отображает лучшие фильмы жанра";
        }
        res.render('thriller', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'thriller',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/thriller' : null,
            active: response.pageNumber + 1,
            metaDescription: metaDescription,
            curLocale: curLocale,
            linkName: 'thriller',
            i18n: res
        });
    });
});

server.get('/ukrainian/:pageNum?/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/ukrainian');
        return;
    }
    const countryCode = 29;
    getFilmsOnPage('ukrainian', req.params.pageNum, null, null, countryCode, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === countryCode && article.isUkrainian === true).content);
        let pageTitle = 'Українські фільми: онлайн підбірка та рекомендації кращих фільмів';
        let metaDescription = 'Переглядайте підбірку українських фільмів на сайті Кіноман. Вона створена нами та містить кращих представників категорії';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === countryCode && article.isUkrainian === false).content);
            pageTitle = 'Украинское кино: онлайн подборка и рекомендации лучших фильмов страны';
            metaDescription = 'Просмотрите новинки украинского кино на сайте Киноман. Лучшее украинские кино в нашей подборке';
        }
        res.render('ukrainian', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'ukrainian',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/ukrainian' : null,
            active: response.pageNumber + 1,
            metaDescription: metaDescription,
            curLocale: curLocale,
            linkName: 'ukrainian',
            i18n: res
        });
    });
});

server.get('/zombie/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    const genreCode = 89;
    getFilmsOnPage('zombie', req.params.pageNum, null, genreCode, null, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === true).content);
        let pageTitle = 'Кіно про зомбі: онлайн підбірка та рекомендації кращих фільмів жанру';
        let metaDescription = 'Переглядайте підбірку фільмів про зомбі на сайті Кіноман. Вона створена нами та містить кращих представників категорії';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === false).content);
            pageTitle = 'Кино про зомби: онлайн подборка лучших фильмов про мертвецов';
            metaDescription = 'Смотрите подборку фильмов про зомби на сайте Киноман. Качественное кино про мертвецов, которое наводит страх';
        }
        res.render('zombie', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'zombie',
            curLocale: curLocale,
            canonicalLink: null,
            metaDescription: metaDescription,
            i18n: res
        });
    });
});

server.get('/films/:pageNum?/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
    if (req.params.pageNum !== null && req.params.pageNum !== undefined && req.params.pageNum &&
        (parseInt(req.params.pageNum) < 2 || parseInt(req.params.pageNum) > 5)) {
        res.redirect('/films');
        return;
    }
    const genreCode = 0;
    getFilmsOnPage('films', req.params.pageNum, null, null, null, function (response) {
        let articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === true).content);
        let pageTitle = 'Фільми для гарного настрою: онлайн підбірка кращих фільмів жанру';
        let metaDescription = 'Переглядайте підбірку фільмів для гарного настрою на сайті Кіноман. Вона створена нами та містить кращих представників категорії';
        if (curLocale === 'ru') {
            response.films.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
            articleContent = html_renderer.documentToHtmlString(movieArticles.find(article => article.genre === genreCode && article.isUkrainian === false).content);
            pageTitle = 'Фильмы под настроение: онлайн подборка лучших позитивных фильмов';
            metaDescription = 'Смотрите подборку кино про зомби на сайте Киноман. Кино про зомби апокалипсис, которое наводит страх';
        }
        res.render('films', {
            articleContent: articleContent,
            films: response.films,
            pageTitle: pageTitle,
            pageName: 'films',
            canonicalLink: response.pageNumber !== 0 ? req.protocol + '://' + req.get('host') + '/films' : null,
            active: response.pageNumber + 1,
            metaDescription: metaDescription,
            curLocale: curLocale,
            linkName: 'films',
            i18n: res
        });
    });
});

server.get('/selection', function (req, res) {
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

        if (res.locale === 'ru') {
            results.forEach(film => {
                film.Title = film.TitleRu;
                film.Description = film.DescriptionRu;
            });
        }
        res.render('partials/filmList', {films: results, i18n: res, curLocale: res.locale}, function (err, html) {
            if (err) {
                return res.sendStatus(500);
            }
            res.send(html);
        });
    });
});

server.get('/selection/form/:lang?', function (req, res) {
    let curLocale = getCurLocale(req, res);
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
            let pageTitle = 'Пошук фільму - швидкий і зручний підбір фільму за заданими параметрами';
            let metaDescription = 'Використайте алгоритм підбору фільмів сайту Кіноман та з легкістю підберіть фільм під ваш настрій та інші параметри';
            if (curLocale === 'ru') {
                genres.forEach(genre => genre.Name = genre.NameRu);
                countries.forEach(country => country.Name = country.NameRu);
                pageTitle = 'Поиск фильма – быстрый и удобный подбор фильмов за параметрами';
                metaDescription = 'Используйте алгоритм подбора фильмов сайта Киноман и с легкостью выберите фильм под ваше настроение';
            }
            res.render('selection', {
                pageName: 'selection',
                pageTitle: pageTitle,
                metaDescription: metaDescription,
                canonicalLink: null,
                countries: countries,
                genres: genres,
                moods: moods,
                curLocale: curLocale,
                i18n: res
            });
        });
    });
});

server.get('*', function (req, res) {
    res.status(404).send('what???');
});
