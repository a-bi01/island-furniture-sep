var db = require('./databaseConfig.js');

module.exports.getShowroomItems = function (callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

        var sql = 'SELECT * FROM itementity WHERE DTYPE = "FurnitureEntity"';

        conn.query(sql, function (err, result) {
            conn.end();

            if (err) {
                return callback(err, null);
            }

            return callback(null, result);
        });
    });
};

module.exports.getPromotions = function (callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

        var sql = 'SELECT * FROM promotionentity';

        conn.query(sql, function (err, result) {
            conn.end();

            if (err) {
                return callback(err, null);
            }

            return callback(null, result);
        });
    });
};

module.exports.getShowroomItemsByRoom = function (room, callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

        var sql = `
            SELECT *
            FROM itementity
            WHERE DTYPE = 'FurnitureEntity'
            AND category = ?
        `;

        conn.query(sql, [room], function (err, result) {
            conn.end();

            if (err) {
                return callback(err, null);
            }

            return callback(null, result);
        });
    });
};