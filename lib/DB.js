'use strict';

const moment = require('moment');
const path = require('path');
const sqlite3 = require('sqlite3');

class DB {

    #file;
    #conn;

    constructor(file) {
        this.#file = file ?? path.join(__dirname, '..', 'wx.sqlite3');
    }

    open(callback) {
        this.#conn = new sqlite3.Database(this.#file, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE | sqlite3.OPEN_FULLMUTEX, err => {
            if (err) {
                return callback(err);
            }

            this.#createTables(err => {
                if (err) {
                    return callback(err);
                }

                callback();
            });
        });
    }

    #createTables(callback) {
        const table = `
            CREATE TABLE IF NOT EXISTS events (
                deduplicationId TEXT PRIMARY KEY,
                type TEXT,
                time TEXT,
                tenantId TEXT,
                applicationId TEXT,
                deviceProfileId TEXT,
                devEui TEXT,
                json TEXT
            );
        `;

        this.#conn.run(table, [], err => {
            if (err) {
                return callback(err);
            }

            callback();
        });
    }

    eventCreate(evt, callback) {

        const sql = 'INSERT INTO events (deduplicationId, type, time, tenantId, applicationId, deviceProfileId, devEui, json) VALUES (?, ?, ?, ?, ?, ?, ?, ?);'
        const vals = [ evt.deduplicationId, evt.type, evt.time, evt.tenantId, evt.applicationId, evt.deviceProfileId, evt.devEui, evt.json ];

        this.#conn.run(sql, vals, err => {
            if (err) {
                return callback(err);
            }

            callback();
        });
    }

    eventStats(type, devEui, path, since, callback) {
        const sql = 'SELECT strftime("%Y-%m", json_extract(json, "$.time")) as d, min(json_extract(json, ?)) as min, avg(json_extract(json, ?)) as avg, max(json_extract(json, ?)) as max FROM events WHERE type = ? AND devEui = ? GROUP BY d ORDER BY d;';
        const vals = [ path, path, path, type, devEui ];

         this.#conn.all(sql, vals, (err, results) => {
            if (err) {
                return callback(err);
            }

            callback(null, results);
        });
    }

    eventStatsAll(type, devEui, path, callback) {
        const stats = {};


        this.eventStats('up', 'a84041d871888363', '$.object.TempC_SHT', '2000-01-01T00:00:00', (err, byMonth) => {
            if (err) {
                return callback(err);
            }

            stats.byMonth = byMonth;

            this.#conn.all('SELECT min(time) first, max(time) last, count(*) nevents from events', [], (err, results) => {
                if (err) {
                    return callback(err);
                }

                Object.assign(stats, results[0]);
                callback(null, stats);
            });
        });
    }

    eventGetLatest(type, devEui, callback) {

        const sql = 'SELECT * FROM events WHERE type = ? and devEui = ? ORDER BY time DESC, deduplicationId LIMIT 1;';
        const vals = [ type, devEui ];

         this.#conn.all(sql, vals, (err, events) => {
            if (err) {
                return callback(err);
            } else if (events.length === 0) {
                err = new Error('Not Found');
                err.type = type;
                err.devEui = devEui;
                err.status = 404;
                err.code = 'ENOENT';
                err.name = 'EVENT_NOT_FOUND';
                return callback(err);
            }

            events[0].json = JSON.parse(events[0].json);

            callback(null, events[0]);
        });
    }

    close(callback = () => {}) {
        this.#conn.close();
        this.#conn = null;
        setImmediate(() => callback());
    }
}

module.exports = DB;
