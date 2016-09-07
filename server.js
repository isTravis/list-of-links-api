if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const osprey = require('osprey');
const express = require('express');
var bodyParser = require('body-parser');
const join = require('path').join;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

const path = join(__dirname, 'api.raml');

const User = require('./models').User;
const Link = require('./models').Link;
const Follow = require('./models').Follow;

osprey.loadFile(path).then(function (middleware) {

	app.use(middleware);

	app.all('/*', function(req, res, next) {
		res.header("Access-Control-Allow-Origin", req.headers.origin);
		res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
		res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
		res.header("Access-Control-Allow-Credentials", true);
		next();
	});

	app.use(function (err, req, res, next) {
		// Handle errors.
		console.log("Error! " + err + ", " + next)
		next();
	});

	// Short-circuit the browser's annoying favicon request. You can still
	// specify one as long as it doesn't have this exact name and path.
	app.get('/favicon.ico', function(req, res) {
		res.writeHead(200, { 'Content-Type': 'image/x-icon' });
		res.end();
	});

	/* POST a new user */
	app.post('/user', function(req, res, next) {
		User.create(req.body)
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			res.status(500).json(err);
		});
	});

	/* GET one user by username or id*/
	app.get('/user/:id', function(req, res, next) {
		User.findOne({
			where: {$or: [{username: req.params.id}, {id: req.params.id}] },
			include: [ Link ]
		})
		.then(function(user) {
			res.status(201).json(user);
		})
		.catch(function(err) {
			res.status(500).json(err);
		});
	});

	/* PUT an update to one user */
	app.put('/user/:id', function(req, res, next) {
		User.update(req.body, {
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			res.status(500).json(err);
		});
	});


	const port = process.env.PORT || 9876;
	app.listen(port, (err) => {
		if (err) { console.error(err); }
		console.info('----\n==> 🌎  API is running on port %s', port);
		console.info('==> 💻  Send requests to http://localhost:%s', port);
	});
})
.catch(function(e) { console.error("Error: %s", e.message); });
