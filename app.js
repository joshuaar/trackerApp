
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

//adds remotes to connected object, to be accessed by others
app.get('/p/:dev/listen',function(req,res){
    //console.log(connected[req.params.dev] == null)
    if(connected[req.params.dev]){

        //connected[req.params.dev]["res"].send(200) //deal with old request
        //connected[req.params.dev] = {res:res,time:new Date().getTime()} //Put new request in connected dict.
        res.send(403)
        console.log(connected)
    } else {
        var time = new Date().getTime()
        connected[req.params.dev] = {res:res,time:time} //Put new request in connected dict
        //res.send("hello")
        setTimeout(function(){   //After a certain time, remove connection from dict of active connections
            try{
               // console.log(connected[req.params.dev]["time"])
               // console.log(time)
                if(connected[req.params.dev]["time"] == time){
                    connected[req.params.dev]["res"].send(200)
                    connected[req.params.dev] = null
                }
            } catch (exception) {
                console.log("request expired")
            }
        },longPollTimeout)
    }
})

app.get('/m/:dev/:msg',function(req,res){
    console.log(req.params.msg)
    if(connected[req.params.dev]){
        connected[req.params.dev]["res"].send("Greetings from elsewhere: "+req.params.msg)
        connected[req.params.dev] = null
        res.send(200)
    }
    res.send("Device not connected")

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
