var db = require('./databaseConfig.js');

// 1. GET ALL ITEMS - retrieves all furniture items
module.exports.getShowroomItems = function (callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

// joins multiple tables to get basic details, dimensions, images and pricing
        var sql = `
            SELECT i.ID, i.NAME, i.CATEGORY, i.SKU, i.DESCRIPTION, 
                   i._LENGTH, i.WIDTH, i.HEIGHT, 
                   f.IMAGEURL, MAX(p.RETAILPRICE) as RETAILPRICE 
            FROM itementity i 
            JOIN furnitureentity f ON i.ID = f.ID 
            LEFT JOIN item_countryentity p ON i.ID = p.ITEM_ID 
            WHERE i.DTYPE = "FurnitureEntity" 
            GROUP BY i.ID, i.NAME, i.CATEGORY, i.SKU, i.DESCRIPTION, i._LENGTH, i.WIDTH, i.HEIGHT, f.IMAGEURL
        `;

        conn.query(sql, function (err, result) {
            conn.end();
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    });
};

// 2. GET PROMOTIONS - fetches current active promotions only (leaving the expired ones)
module.exports.getPromotions = function (callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

// gets promotion details WHERE ensures we only show promotions that are still valid 
        var sql = `
  SELECT 
                p.ID, p.DESCRIPTION, p.DISCOUNTRATE, p.STARTDATE, p.ENDDATE, p.IMAGEURL,
                p.COUNTRY_ID, p.ITEM_ID,
                i.SKU, i.NAME AS ITEMNAME, i.CATEGORY
            FROM promotionentity p
            JOIN itementity i ON p.ITEM_ID = i.ID
            WHERE p.ENDDATE >= CURDATE()
`;

        conn.query(sql, function (err, result) {
            conn.end();
            if (err) {
                return callback(err, null);
            }
            return callback(null, result);
        });
    });
};

// 3. GET ITEMS BY ROOM (SMART FILTER) - filters to multiple categories 
module.exports.getShowroomItemsByRoom = function (room, callback) {
    var conn = db.getConnection();

    conn.connect(function (err) {
        if (err) {
            return callback(err, null);
        }

        var categories = [];

        // Define which categories belong to which room
        if (room === 'Living Room') {
            categories = ['Sofas & Chair', 'Tables & Desks', 'Lightings'];
        } 
        else if (room === 'Bedroom') {
            categories = ['Beds & Mattresses', 'Lightings', 'Cabinets & Storage'];
        } 
        else if (room === 'Study') {
            categories = ['Tables & Desks', 'Cabinets & Storage', 'Lightings', 'Study','Sofas & Chair'];
        } 
        else if (room === 'Kitchen') {
             categories = ['Tables & Desks', 'Cabinets & Storage']; 
        }
        else {
            categories = [room];
        }

// creates a string of ? matching the number of categories      
        var placeholders = categories.map(() => '?').join(',');


        var sql = `
            SELECT i.ID, i.NAME, i.CATEGORY, i.SKU, i.DESCRIPTION, 
                   i._LENGTH, i.WIDTH, i.HEIGHT, 
                   f.IMAGEURL, MAX(p.RETAILPRICE) as RETAILPRICE 
            FROM itementity i 
            JOIN furnitureentity f ON i.ID = f.ID 
            LEFT JOIN item_countryentity p ON i.ID = p.ITEM_ID 
            WHERE i.DTYPE = "FurnitureEntity" 
            AND i.CATEGORY IN (${placeholders}) 
            GROUP BY i.ID, i.NAME, i.CATEGORY, i.SKU, i.DESCRIPTION, i._LENGTH, i.WIDTH, i.HEIGHT, f.IMAGEURL
        `;

// pass the categories array as second argument to replace the ?
        conn.query(sql, categories, function (err, result) {
            conn.end();
            if (err) {
                console.log("DB Error:", err);
                return callback(err, null);
            }
            return callback(null, result);
        });
    });
};