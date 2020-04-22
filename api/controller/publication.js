'use strict'

var path = require('path');
var fs = require('fs');
var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');
var mongoose = require('mongoose');

var Publication = require('../models/publication');
var User = require('../models/user');
var Follow = require('../models/follow');



function prueba(req, res){
    res.status(200).send({
        message: 'Hola desde el server de Publicaciones'
    });
}

function saveUser(req, res){
    var params = req.body;

    if(!params.text) return res.status(200).send({ message: 'Se debe enviar una publicación que contenga texto'});

    var publication = new Publication();

    publication.text = params.text;
    publication.file = null;
    publication.user = req.user.sub;
    publication.created_at = moment().unix();

    publication.save((err, publicationStored) => {
        if(err) return res.status(500).send({message: 'Error en la petición de guardado'});

        if(!publicationStored) return res.status(404).send({message: 'No se ha guardado la publicación'});

        return res.status(200).send({publication: publicationStored});
    });
}

function getPublications(req, res){

    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Follow.find({user: req.user.sub}).populate('followed').exec((err, follows) => {
        if(err) return res.status(500).send({message: 'Error devolviendo el seguimiento'});

        if(!follows) return res.status(404).send({message: 'No estás siguiendo a ningún usuario'});

        var followed_clean = [];

        follows.forEach((follow) => {
            followed_clean.push(follow.followed);
        });
        followed_clean.push(req.user.sub);

        Publication.find({user: {"$in": followed_clean}}).sort('-created_at').populate('user', {'password':0}).paginate(page, itemsPerPage, (err, publications, total) => {
            if(err) return res.status(500).send({message: 'Erro al devolver las publicaciones'});

            if(!publications) return res.status(404).send({message: 'No existe publicaciones para mostrar'});

            return res.status(200).send({
                total_items: total,
                items_per_page: itemsPerPage,
                pages: Math.ceil(total/itemsPerPage),
                page: page,
                publications
            });
        });

    });
}

function getPublication(req, res){
    var publicatioId = req.params.id;

    Publication.findById(publicatioId, (err, publication) => {
        if(err) return res.status(500).send({message: 'Error al devolver la publicación'});

        if(!publication) return res.status(404).send({message: 'No existe la publicación solicitada'});

        return res.status(200).send({publication});
    });
}

function deletePublication(req, res){
    var publicationId = req.params.id;

    Publication.find({'user': req.user.sub, '_id': publicationId}).remove((err, publicationRemoved) => {
        if(err) return res.status(500).send({message: 'Error al intentar eliminar la publicación'});

        return res.status(200).send({message: 'La publicación ha sido eliminada'});
    });
}

function uploadImage(req, res){
    var publicationId = req.params.id;
    mongoose.set('useFindAndModify', false);

    if(req.files){
        var file_path = req.files.file.path;
        var file_split = file_path.split('\\');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];
        

        if(file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif' || file_ext == 'png' || file_ext == 'JPG' || file_ext == 'JPEG' || file_ext == 'PNG' || file_ext == 'GIF'){

            Publication.findOne({'user': req.user.sub, '_id': publicationId}).exec().then((publication) => {

                if(publication){
                   
                    Publication.findOneAndUpdate({'user': req.user.sub, '_id': publicationId}, {file: file_name}, {new: true}, (err, publicationUpdated) => {

                        if(err) return res.status(500).send({message: 'Error en el servidor al intentar actualizar archivo'});
    
                        if(!publicationUpdated) return res.status(404).send({message: 'No se ha podido actualizar la publicación'});
    
                        return res.status(200).send(publicationUpdated);        
    
                    });
    
                } else{
                    removeFilesOfUploads(res, file_path, 'No tienes permiso para editar esta publicación');
                }

            }).catch((err) => {

                return res.status(500).send({message: 'Error al buscar la publicación'});

            });
        } else {
            removeFilesOfUploads(res, file_path, 'Extensión no válida');
        }

    } else {

        return res.status(500).send({message: 'No se subieron archivos'});

    }
}

function removeFilesOfUploads(res, file_path, message){
    fs.unlink(file_path, (err) => {
        return res.status(200).send({message: message});
    });
}


function getImageFile(req, res){
    
    var image_file = req.params.imageFile;
    var path_file = './uploads/publications/'+image_file;
    
    fs.exists(path_file, (exists) => {
        if(exists){
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({message: 'No existe la imagen'});
        }
    });
}

function getPublicationsUser(req, res){

    var page = 1;
    var user = req.user.sub;

    if(req.params.user){
        user = req.params.user;
    }

    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 4;

        Publication.find({user: user}).sort('-created_at').populate('user', {'password':0}).paginate(page, itemsPerPage, (err, publications, total) => {
            if(err) return res.status(500).send({message: 'Erro al devolver las publicaciones'});

            if(!publications) return res.status(404).send({message: 'No existe publicaciones para mostrar'});

            return res.status(200).send({
                total_items: total,
                items_per_page: itemsPerPage,
                pages: Math.ceil(total/itemsPerPage),
                page: page,
                publications
        });

    });
}

module.exports = {
    prueba,
    saveUser,
    getPublications,
    getPublication,
    deletePublication,
    uploadImage,
    getImageFile, 
    getPublicationsUser
}
