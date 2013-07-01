
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



//Routes for listening and sending messages to registered devices

app.get('/p/:dev',mongoCon.longPollHandler)
setInterval(function(){mongoCon.rmOld(40000)},40000)
app.post('/p/:dev',mongoCon.devPostHandler)

//Routes for adding, getting, deleting (potentially) connectable devices

//get all information about a uid
app.get('/u/:uid', function(req,res){
    mongoCon.getIPs(req.params.uid,function(ips){
        res.send(ips)
    })
})

//get a particular device info
app.get("/u/:uid/:devID",function(req,res){
    mongoCon.getDevInfo(req.params.uid,req.params.devID,function(devInfo){
        res.send(devInfo)
    })
})

app.post('/u/:uid',function(req,res){
    var extern = req.connection.remoteAddress
    var intern = req.body.IP
    var uid = req.params.uid
    mongoCon.insertIP(extern,intern,req.params.uid, function(devID){

        res.send({ipLocal:intern,ipExternal:extern,devID:devID})
    })
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
