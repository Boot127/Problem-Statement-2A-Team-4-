const service = require('../services/adminArchiveService');

async function list(req,res){res.json(await service.list(req.query));}
async function restore(req,res){res.json(await service.restore(req.params.entityType,req.params.id,req.user));}
async function permanentlyDelete(req,res){res.json(await service.permanentlyDelete(req.params.entityType,req.params.id,req.user));}

module.exports={list,restore,permanentlyDelete};
