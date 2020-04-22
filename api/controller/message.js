'use strict'

var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

function prueba(req, res){
    return res.status(200).send({message: 'Hola desde message prueba'});
}

function saveMessage(req, res){
    
    var params =  req.body;

    if(!params.text || !params.receiver) return res.status(200).send({message: 'Por favor, ingrese los campos necesarios'});

    var message = new Message();

    message.emitter = req.user.sub;
    message.receiver = params.receiver;
    message.text = params.text;
    message.created_at = moment().unix();
    message.viewed = 'false';

    message.save((err, messageStored) => {

        if(err) return res.status(500).send({message: 'Error en la petición'});

        if(!messageStored) return res.status(404).send({message: 'Error al guardar el mensaje'});

        return res.status(200).send({message: messageStored});

    });

}

function getReceivedMessages(req, res){
    
    var userId = req.user.sub;
    var page = 1;
    var itemsPerPage = 4;

    if(req.params.page){
        page = req.params.page;
    }

    Message.find({receiver: userId}).populate('emitter', 'name surname nick image _id').sort('-created_at').paginate(page, itemsPerPage, (err, messages, total) => {
        
        if(err) return res.status(500).send({message: 'Error en la petición'});

        if(!messages) return res.status(404).send({message: 'No hay mensajes para mostrar'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            messages 
        });

    });

}

function getEmitMessages(req, res){

    var userId = req.user.sub;
    var page= 1;
    var itemsPerPage = 4;

    if(req.params.page){
        page = req.params.page;
    }

    Message.find({emitter: userId}).populate('emitter receiver', 'name surname nick image _id').sort('-created_at').paginate(page, itemsPerPage, (err, messages, total) => {

        if(err) return res.status(500).send({message: 'Error en la petición'});

        if(!messages) return res.status(404).sen({message: 'No hay mensajes para mostrar'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            messages
        })

    });

}

function getUnviewedMessages(req, res){

    var userId = req.user.sub;

    Message.count({receiver: userId, viewed: 'false'}).exec().then((count) => {

        if(!count) return res.status(404).send({message: 'No hay mensajes sin leer'});

        return res.status(200).send({unviewed: count});

    }).catch((err) => {

        return handleError(err);

    });

}

function setViewedMessages(req, res){

    var userId = req.user.sub;

    Message.update({receiver: userId, viewed: 'false'}, {viewed: 'true'}, {"multi": true}, (err, messagesUpdated) => {
        
        if(err) return res.status(500).send({message: 'Error en la petición'});

        return res.status(200).send({
            messages: messagesUpdated
        });

    });

}

module.exports = {
    prueba,
    saveMessage,
    getReceivedMessages,
    getEmitMessages,
    getUnviewedMessages,
    setViewedMessages
}