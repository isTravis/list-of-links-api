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

	/* ------------------- */
	/* ------------------- */
	/* Begin API Endpoints */
	/* ------------------- */
	/* ------------------- */

	/* POST a new user */
	app.post('/user', function(req, res, next) {
		User.create({
			username: req.body.username,
			name: req.body.name,
			image: req.body.image,
			email: req.body.email,
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* GET one user by username or id*/
	app.get('/user/:id', function(req, res, next) {
		const query = isNaN(req.params.id) ? {username: req.params.id} : {id: req.params.id};
		User.findOne({
			where: query,
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower'}, {model: User, as: 'following', foreignKey: 'followee'} ]
		})
		.then(function(user) {
			res.status(201).json(user);
		})
		.catch(function(err) {
			console.log(err);
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
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* Delete a user */
	app.delete('/user/:id', function(req, res, next) {
		User.destroy({
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* POST a new Link */
	app.post('/link', function(req, res, next) {
		console.log(req.body);
		Link.create({
			UserId: req.body.UserId,
			title: req.body.title,
			url: req.body.url,
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* PUT an update to one link */
	app.put('/link/:id', function(req, res, next) {
		Link.update(req.body, {
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* Delete a Link */
	app.delete('/link/:id', function(req, res, next) {
		Link.destroy({
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* POST a new Follow */
	app.post('/follow', function(req, res, next) {
		Follow.create({
			follower: req.body.follower,
			followee: req.body.followee,
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* PUT an update to one Follow */
	app.put('/follow/:id', function(req, res, next) {
		Follow.update(req.body, {
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* Delete a Follow */
	app.delete('/follow/:id', function(req, res, next) {
		Follow.destroy({
			where: {id: req.params.id}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
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
