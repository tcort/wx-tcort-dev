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

    eventGetLatest(type, devEui, callback) {

        const sql = 'SELECT * FROM events WHERE type = ? and devEui = ? ORDER BY time, deduplicationId LIMIT 1;';
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
