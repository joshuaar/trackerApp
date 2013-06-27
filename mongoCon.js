
var mongoose = require('mongoose');
var dbName = 'mongodb://localhost/test';
var crypto = require('crypto')
mongoose.connect(dbName)

//Define schema
var ipSchema = mongoose.Schema({
	ip: {external:String,local:String},
    time:Number,
	uid: String,
    devID: String
});

var msgSchema = mongoose.Schema({
    devID: String,
    msg: String
})

ipSchema.methods.speak = function() {
	console.log("IP: "+this.ip+"\tUID: "+this.uid)
};

var MSG = mongoose.model("MSG",msgSchema)

var IP = mongoose.model('IP',ipSchema)

//Represents a connected request
function ConRequest(res,time){
    this.res = res
    this.time = time
    this.sendAlert = function(uid,devID){
        this.res.send({type:"alert",uid:uid,devID:devID})
    }
    this.sendMsg = function(msg){
        this.res.send(msg)
    }
    this.send = function(msg){
        this.res.send(msg)
    }
}

//Insert an IP address with uid into the DB
var insertIP = function(ip,ipLocal, uid, callback) {
	console.log("Creating new IP address Entry for "+ uid)
    crypto.randomBytes(10,function(ex,buf){    //generate random dev id
        var devID = buf.toString('hex')
        var entry = {ip:{external:ip,local:ipLocal}, uid:uid, time:new Date().getTime()}
        var uniqueID = {ip:{external:ip,local:ipLocal}, uid:uid} //user id, local and external IPs uniquely ID a device on network
        IP.find(uniqueID,function(err,ips){

            if(err) throw err
            if(ips.length == 0){
                console.log("Does not exist, creating new entry")
                entry["devID"] = devID
                var ipEntry = new IP(entry)
                ipEntry.save(function(err, ipEntry){//The function is called, this is to check errors
                    if(err) throw err;
                    ipEntry.speak();
                    //alertUID(uid,devID)
                    callback(devID)
                });
            }
            else {
                console.log("Record exists, updating timestamp")
                IP.update(uniqueID,entry,function(err, numAffected){
                    if(err) throw err
                    console.log("updated "+numAffected+" records")
                    console.log(ips)
                    callback(ips[0].devID)//give existing devID
                })
            }
        })
    })
};

//Alerts all connectable devices that a new device has come online
var alertUID = function(uid,devID){
    IP.find({uid:uid},function(err,records){
        if(err) throw err
        for(var i=0;i<records.length;i++){
            var curdev = records[i].devID
            if(connected[curdev]){
                if(curdev != devID){
                    connected[curdev].sendAlert(uid,devID)
                    connected[curdev] = null
                }
            }
        }
    })
}

var longPollTimeout = 30000
var connected = {}
var longPollHandler = function(req,res){

    if(connected[req.params.dev]){

        res.send(403)
        console.log(connected)
    } else {
        isRegisteredDevice(req,function(err){
            if(err){
                res.send(404)//Device was not found registered
            }
            //What to do if the listening device is registered (everything is going well)
            else{
                var time = new Date().getTime()
                connected[req.params.dev] = new ConRequest(res,time) //Put new request in connected dict

                updateDevTimestamp(req.params.dev,time)//update timestamp in DB

                setTimeout(function(){   //After a certain time, remove connection from dict of active connections
                    try{

                        if(connected[req.params.dev].time == time){
                            connected[req.params.dev].send(200)
                            connected[req.params.dev] = null
                        }
                    } catch (exception) {
                        console.log("request expired")
                    }
                },longPollTimeout)
            }
        })
    }
}

var devPostHandler = function(req,res){
    if(connected[req.params.dev]){
        console.log(req.body)
        connected[req.params.dev].send(JSON.stringify(req.body))
        connected[req.params.dev] = null
        res.send(200)
    }
    res.send(404)

}

//get the IPs associated with a user ID
var getIPs = function(uid, callback) {
	console.log("Fetching IPs for "+uid)
	IP.find({uid: uid} ,function(err, ips) {
		if(err) throw err
        var ipTxt = new Array()
        for(var i=0;i<ips.length;i++){
            ipTxt[i]={ipLocal:ips[i].ip.local,ipExternal:ips[i].ip.external,devID:ips[i].devID}
        }
		callback(ipTxt)
	})
}
//fires callback if device is registered, else err
var isRegisteredDevice = function(req, callback) {
    var devID = req.params.dev
    IP.find({devID:devID}, function(err,devs) {
        if(devs.length > 0){
            var record = devs[0]
            var ipOnRecord = record["ip"]["external"]
            if(ipOnRecord == req.connection.remoteAddress){
                callback(0)
            }
            else{
                callback(new Error("Device IP does not match request"))
            }

        }
        else {
            callback(new Error("Device not found"))
        }
    })
}

var getDev = function(uid, localIP, externalIP, callback) {
    IP.find({uid:uid,ip:{external:externalIP,local:localIP}},function(err,results){
        if(err) throw err
        callback(results)
    })
}

var updateDevTimestamp = function(devID,time) {
    IP.update({devID:devID},{time:time},function(err,numAffected){
        if(err) throw err
        console.log(numAffected+" timestamp records updated")
    })
}

var clearUID = function(uid) {
	IP.find({uid: uid}, function(err,ips){
		if(err) throw err
		console.log("Clearing "+uid)
		for(var i = 0; i < ips.length; i++){
			ips[i].remove()
		}
	});
};

var rmOld = function(timeout) {
    cutoffTime = new Date().getTime() - timeout
    IP.find({time: {$lte:cutoffTime}},function(err,ips){
        for(var i = 0; i < ips.length; i++){
            ips[i].remove()
        }
        console.log("cleaned up "+ips.length+" records")
    })
}

//Export the functions
exports.insertIP = insertIP;
exports.getIPs = getIPs
exports.clearUID = clearUID
exports.updateDevTimestamp = updateDevTimestamp
exports.rmOld = rmOld
exports.longPollHandler = longPollHandler
exports.devPostHandler = devPostHandler
//clearUID("Default")
//insertIP("192.168.1.123", "Default")
//getIPs("Default",console.log)

