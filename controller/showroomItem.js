var express = require('express');
var app = express();
var showroomItemModel = require('../model/showroomItem');

// Get furniture for showroom
app.get('/api/getShowroomItems', function (req, res) {
    showroomItemModel.getShowroomItems(function (err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.send(result);
    });
});

// Get active promotions
app.get('/api/getPromotions', function (req, res) {
    showroomItemModel.getPromotions(function (err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.send(result);
    });
});

// Showroom – view by room category
app.get('/api/getShowroomItemsByRoom/:room', function (req, res) {
    var room = req.params.room;

    if (!room) {
        return res.status(400).send("Room category is required");
    }

    showroomItemModel.getShowroomItemsByRoom(room, function (err, result) {
        if (err) {
            console.log(err);
            return res.status(500).send("Database Error");
        }

        res.send(result);
    });
});

module.exports = app;