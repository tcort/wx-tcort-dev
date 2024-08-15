'use strict';

const _ = require('lodash');
const DB = require('./DB');
const express = require('express');
const methodOverride = require('method-override');
const moment = require('moment-timezone');
const path = require('path');
const qs = require('qs');
const wx = require('./wx');

function routerFactory(options = {}) {

    const router = express.Router({
        strict: true,
        caseSensitive: true,
        mergeParams: true,
    });

    router.use(express.static(path.join(__dirname, '..', 'public'), { etag: false }));
    router.use(express.json());
    router.use(express.urlencoded({ extended: false }));
    router.use(methodOverride('_method'));

    router.use(function (req, res, next) {

        res.locals.ts = Date.now();

        req.db = new DB();

        req.db.open(err => {
            if (err) {
                return next(err);
            }
            next();
        });
    });

    router.get('/', function (req, res, next) {

        req.db.eventGetLatest('up', 'a84041d871888363', (err, evt) => {
            if (err) {
                return next(err);
            }
            const temperature_c = evt.json.object.TempC_SHT;
            const relative_humidity = evt.json.object.Hum_SHT;
            const timestamp = moment(evt.time).tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss (z)');
            const heat_index_c = wx.heatIndexCelsius(temperature_c, relative_humidity);

            req.db.eventStatsAll('up', 'a84041d871888363', '$.object.TempC_SHT', function (err, stats) {
                if (err) {
                    return next(err);
                }

                stats.first = moment(stats.first).tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss (z)');
                stats.last = moment(stats.last).tz('America/Toronto').format('YYYY-MM-DD HH:mm:ss (z)');

                res.render('index', {
                    temperature_c: temperature_c.toFixed(2),
                    relative_humidity: relative_humidity.toFixed(2),
                    heat_index_c: heat_index_c.toFixed(2),
                    timestamp,
                    stats,
                }, function (err, html) {
                    if (err) {
                        return next(err);
                    }
                    res.send(html);
                    req.db.close();
                });
            });
        });
    });

    router.post('/events', function (req, res, next) {

        const authorization = req.get('authorization');
        if (!authorization) {
            res.sendStatus(401);
            req.db.close();
            return;
        }

        if (!options.allowed_tokens.includes(authorization)) {
            res.sendStatus(403);
            req.db.close();
            return;
        }

        next();

    }, function (req, res, next) {
        req.db.eventCreate({
            deduplicationId: req.body?.deduplicationId,
            type: req.query?.event,
            time: req.body?.time,
            tenantId: req.body?.deviceInfo?.tenantId,
            applicationId: req.body?.deviceInfo?.applicationId,
            deviceProfileId: req.body?.deviceInfo?.deviceProfileId,
            devEui: req.body?.deviceInfo?.devEui,
            json: JSON.stringify(req.body, null, 4),
        }, err => {
            if (err) {
                return next(err);
            }

            res.status(201);
            res.json({ ok: true });
            req.db.close();
        });

    });

    router.use(function (req, res, next) {
        req.db.close(err => {
            req.db = null;
            if (err) {
                return next(err);
            }

            if (!res.headersSent) {
                err = new Error('Not Found');
                err.status = 404;
                err.url = req.url;
                return next(err);
            }

            // done :)
        });
    });

    router.use(function (err, req, res, next) {
        console.log(err);
        if (req.db) {
            req.db.close(innerErr => {
                req.db = null;
                if (innerErr) {
                    console.log(innerErr);
                }
                res.json(err);
            });
            return;
        }

        res.json(err);
    });

    return router;
}

module.exports = routerFactory;
