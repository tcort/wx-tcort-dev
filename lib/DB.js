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

    close(callback = () => {}) {
        this.#conn.close();
        this.#conn = null;
        setImmediate(() => callback());
    }
}

module.exports = DB;
