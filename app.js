
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();

var mongoCon = require('./mongoCon')

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

//Routes for polling
var longPollTimeout = 30000
var connected = {}

app.get('/p/uid/:dev',function(req,res){
    if(connected[req.params.dev]){

        connected[req.params.dev]["req"].send(200) //deal with old request
        connected[req.params.dev] = {req:req,time:new Date().getTime()} //Put new request in connected dict.

    } else {
        connected[req.params.dev] = {req:req,time:new Date().getTime()} //Put new request in connected dict
    }
    setTimeout(function(){   //After a certain time, remove connection from dict of active connections
        connected[req.params.dev]["req"].send(200)
        connected[req.params.dev] = null
    },longPollTimeout)

})


//Routes for adding, getting, deleting (potentially) connectable devices

app.get('/u/:uid', function(req,res){
    mongoCon.getIPs(req.params.uid,function(ips){
        var ipTxt = new Array()
        for(var i=0;i<ips.length;i++){
            ipTxt[i]=ips[i].ip
        }
        res.send(ips)
    })

})

app.post('/u/:uid',function(req,res){
    var extern = req.connection.remoteAddress
    var intern = req.body.IP
    mongoCon.insertIP(extern,intern,req.params.uid)
    res.send({extern:extern,intern:intern})
})

app.delete('/u/:uid',function(req,res){
    try{
        mongoCon.clearUID(req.params.uid)
        res.send(200)
    } catch (exception) {
        res.send(404)
    }
})


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
