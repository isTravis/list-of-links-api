if (process.env.NODE_ENV !== 'production') {
	require('./config.js');
}

const osprey = require('osprey');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const join = require('path').join;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());

const path = join(__dirname, 'api.raml');

const sequelize = require('./models').sequelize;
const User = require('./models').User;
const Link = require('./models').Link;
const Follow = require('./models').Follow;

/*--------*/
// Configure app session
/*--------*/
// const Sequelize = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
app.use(session({
	secret: 'superdupersecret',
	resave: true,
	saveUninitialized: true,
	store: new SequelizeStore({
	  db: sequelize
	}),
	cookie: {
		path: '/',
		// domain: '127.0.0.1', // This was causing all sorts of mayhem. 
		httpOnly: false,
		secure: false,
		maxAge: 30 * 24 * 60 * 60 * 1000// = 30 days.
	},
}));

/*--------*/
// Configure app login
/*--------*/
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(
  function(username, password, done) {
  	User.findOne({ where: {username: username} })
	.then(function(user) {
		if (!user) { return done(null, false, { message: 'Incorrect username.' }); }
		if (!user.validPassword(password)) { return done(null, false, { message: 'Incorrect password.' }); }
		return done(null, user);
	})
	.catch(function(err) {
		console.log('Passport err', err);
		return done(err);
	});
  }
));

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser()); // use static serialize and deserialize of model for passport session support
passport.deserializeUser(User.deserializeUser()); // use static serialize and deserialize of model for passport session support

module.exports = app;

require('./uploadPolicy');

// Short-circuit the browser's annoying favicon request. You can still
// specify one as long as it doesn't have this exact name and path.
app.get('/favicon.ico', function(req, res) {
	res.writeHead(200, { 'Content-Type': 'image/x-icon' });
	res.end();
});

/*--------*/
// Start osprey server
/*--------*/
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

	/* GET Login data by cookie*/
	app.get('/login', function(req, res, next) {
		const userID = req.user ? req.user.id : null;
		User.findOne({
			where: {id: userID},
			attributes: { exclude: ['salt', 'hash'] },
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash'] }, include: [{model: Link, as: 'links'}]} ]
		})
		.then(function(user) {
			const output = {...user.dataValues};
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* POST Login data by username, password and authenticate*/
	app.post('/login', passport.authenticate('local'), function(req, res, next) {
		const userID = req.user ? req.user.id : null;
		User.findOne({
			where: {id: userID},
			attributes: { exclude: ['salt', 'hash'] },
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash'] }, include: [{model: Link, as: 'links'}]} ]
		})
		.then(function(user) {
			const output = {...user.dataValues};
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* GET Logout a user */
	app.get('/logout', function(req, res) {
		req.logout();
		res.status(201).json(true);
	});
	

	/* POST a new user */
	app.post('/user', function(req, res, next) {
		const newUser = {
			username: req.body.username,
			name: req.body.name,
			image: req.body.image,
			email: req.body.email,
		};
		User.register(newUser, req.body.password, function(err, account) {
			if (err) {
				console.log('err is', err);
				return res.status(500).json({'success': false});
			}
			
			passport.authenticate('local')(req, res, function() {
				const output = {...account.dataValues};
				delete output.hash;
				delete output.salt;

				return res.status(201).json(output);
			});
		});
	});

	/* GET one user by username or id*/
	app.get('/user/:id', function(req, res, next) {
		const query = isNaN(req.params.id) ? {username: req.params.id} : {id: req.params.id};
		User.findOne({
			where: query,
			include: [ {model: Link, as: 'links'}, {model: User, as: 'followers', foreignKey: 'follower', attributes: { exclude: ['salt', 'hash'] } }, {model: User, as: 'following', foreignKey: 'followee', attributes: { exclude: ['salt', 'hash'] }, include: [{model: Link, as: 'links'}]} ]
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
		const user = req.user || {};
		Link.create({
			UserId: user.id || req.body.UserId,
			title: req.body.title,
			url: req.body.url,
		})
		.then(function(link) {
			res.status(201).json(link);
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
		const user = req.user || {};
		const follower = user.id || req.body.follower;
		const followee = req.body.followee;

		// Do not create a Follow is follower and followee are equal
		if (follower === followee) {
			return res.status(500).json('Follower cannot be followee');
		}

		Follow.findOne({where: {follower: follower, followee: followee}})
		.then(function(existingFollow) {
			if (existingFollow) { throw new Error('Follow already exists'); }
			return Follow.create({
				follower: follower,
				followee: followee,
				lastRead: req.body.lastRead || null,
			});
		})
		.then(function(follow) {
			const findUser = User.findOne({
				where: {id: follow.followee},
				attributes: { exclude: ['salt', 'hash'] },
				include: [{model: Link, as: 'links'}],
			});
			return [follow, findUser];
		})
		.spread(function(follow, user) {
			const output = {
				...user.dataValues,
				Follow: follow
			}
			res.status(201).json(output);
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* PUT an update to one Follow */
	app.put('/follow', function(req, res, next) {
		const user = req.user || {};
		Follow.update(req.body, {
			where: {follower: user.id || req.body.follower, followee: req.body.followee}
		})
		.then(function() {
			res.status(201).json({'success': true});
		})
		.catch(function(err) {
			console.log(err);
			res.status(500).json(err);
		});
	});

	/* DELETE an update to one Follow */
	app.delete('/follow', function(req, res, next) {
		const user = req.user || {};
		Follow.destroy({
			where: {follower: user.id || req.body.follower, followee: req.body.followee}
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
	// app.put('/follow/:id', function(req, res, next) {
	// 	Follow.update(req.body, {
	// 		where: {id: req.params.id}
	// 	})
	// 	.then(function() {
	// 		res.status(201).json({'success': true});
	// 	})
	// 	.catch(function(err) {
	// 		console.log(err);
	// 		res.status(500).json(err);
	// 	});
	// });

	/* Delete a Follow */
	// app.delete('/follow/:id', function(req, res, next) {
	// 	Follow.destroy({
	// 		where: {id: req.params.id}
	// 	})
	// 	.then(function() {
	// 		res.status(201).json({'success': true});
	// 	})
	// 	.catch(function(err) {
	// 		console.log(err);
	// 		res.status(500).json(err);
	// 	});
	// });

	const port = process.env.PORT || 9876;
	app.listen(port, (err) => {
		if (err) { console.error(err); }
		console.info('----\n==> 🌎  API is running on port %s', port);
		console.info('==> 💻  Send requests to http://localhost:%s', port);
	});
})
.catch(function(e) { console.error("Error: %s", e.message); });
