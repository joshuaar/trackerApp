
var mongoose = require('mongoose');
var dbName = 'mongodb://localhost/test';
mongoose.connect(dbName)

//Define schema
var ipSchema = mongoose.Schema({
	ip: {external:String,local:String},
	uid: String
});

//schema method
ipSchema.methods.speak = function() {
	console.log("IP: "+this.ip+"\tUID: "+this.uid)
};

var IP = mongoose.model('IP',ipSchema)

//Insert an IP address with uid into the DB
var insertIP = function(ip,ipLocal, uid) {
	console.log("Creating new IP address Entry for "+ uid)
	var ipEntry = new IP({ip:{external:ip,local:ipLocal}, uid:uid})
	ipEntry.save(function(err, ipEntry){//The function is called, this is to check errors
		if(err) throw err;
		ipEntry.speak();
	});
};

//get the IPs associated with a user ID
var getIPs = function(uid, callback) {
	console.log("Fetching IPs for "+uid)
	IP.find({uid: uid} ,function(err, ips) {
		if(err) throw err
        var ipTxt = new Array()
        for(var i=0;i<ips.length;i++){
            ipTxt[i]=ips[i].ip
        }
		callback(ipTxt)
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

