
var mongoose = require('mongoose');
var dbName = 'mongodb://localhost/test';
mongoose.connect(dbName)

//Define schema
var ipSchema = mongoose.Schema({
	ip: {external:String,local:String},
    time:String,
	uid: String
});


ipSchema.methods.speak = function() {
	console.log("IP: "+this.ip+"\tUID: "+this.uid)
};

var IP = mongoose.model('IP',ipSchema)

//Insert an IP address with uid into the DB
var insertIP = function(ip,ipLocal, uid) {
	console.log("Creating new IP address Entry for "+ uid)
    var entry = {ip:{external:ip,local:ipLocal}, uid:uid, time:new Date().getTime()}
    var uniqueID = {ip:{external:ip,local:ipLocal}, uid:uid} //user id, local and external IPs uniquely ID a device on network
	var ipEntry = new IP(entry)
    IP.find(uniqueID,function(err,ips){
        //console.log(ips)
        if(err) throw err
        if(ips.length == 0){
            console.log("Does not exist, creating new entry")
            ipEntry.save(function(err, ipEntry){//The function is called, this is to check errors
                if(err) throw err;
                ipEntry.speak();
            });
        }
        else {
            console.log("Record exists, updating timestamp")
            IP.update(uniqueID,entry,function(err, numAffected){
                if(err) throw err
                console.log("updated "+numAffected+" records")
            })
        }
    })
};

//get the IPs associated with a user ID
var getIPs = function(uid, callback) {
	console.log("Fetching IPs for "+uid)
	IP.find({uid: uid} ,function(err, ips) {
		if(err) throw err
        //var ipTxt = new Array()
        //for(var i=0;i<ips.length;i++){
       //     ipTxt[i]=ips[i].ip
        //}
		callback(ips)
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

//Export the functions
exports.insertIP = insertIP;
exports.getIPs = getIPs
exports.clearUID = clearUID

//clearUID("Default")
//insertIP("192.168.1.123", "Default")
//getIPs("Default",console.log)

