// Initial setup for server
var http = require("http"),
	express = require("express"),
	bodyParser = require("body-parser"),
	app = express(),
	updateSpeed = 1000; // Calls the main update function this many milliseconds

// Loads index.html inside /client folder
app.use(express.static(__dirname + "/client"));
// Get body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Start the server
http.createServer(app).listen(3000, function(){
	console.log("Server running on port 3000");
});

var temp_id = 0;

// Database of all messages
// Add initial data to database
var database = new Object();
// Array to be referenced to of posts that have expired
// Elements are [posting, Date()]
var removeList = new Object();

// Creates a JSON object for each post
function posting(id, ttl, question, tags, comments){
	"use strict";
	// If no time stamp assigned to message, assign default ID (for initializing the server with data)
	if (id === null){
		id = temp_id;
		temp_id++;
		
	}
	id = id.toString();
	database[id] = {"id": id, "ttl": ttl * 1000, "question": question, "tags": tags, "comments": comments};
}

// Initialize server with data to simulate a database

posting(null, 10, "I'm trying to get my server running via node.js but it's not working. Any pointers?", ["node","server","computer science","programming","web"], []);
posting(null, 20, "What is meant by a handshaking protocol?", ["computer science", "networking"], ["A protocol uses handshaking if the two communicating entities first exchange control packets before sending data to each other.", "SMTP uses handshaking at the application layer whereas HTTP does not."]);
posting(null, 30, "HTTP response messages never have an empty message body. True or False?", ["computer science", "networking", "http"], ["this is false"]);
posting(null, 45, "What comes down but never goes up?", ["riddle", "misc"], ["the answer is rain"]);
posting(null, 60, "What has a foot but no legs?", ["riddle"], []);
posting(null, 75, "If the answer to life is 42, what is the question?", ["life"], []);
posting(null, 90, "What is your favorite thai restaurant?", ["food", "thai", "restaurant"], []);
posting(null, 150, "What information is used by a process running on one host to identify a process running on another host??", ["computer science", "networks"], ["The IP address of the destination host and the port number of the destination socket."]);
posting(null, 210, "Where are cheap places to take a date?", ["relationships", "food", "places"], []);
posting(null, 300, "Which Hawaii island should I go to?", ["travel", "places"], []);
posting(null, 600, "Do you know a good revolving sushi place?", ["food", "sushi"], []);



// A function that is called constantly by the server to reduce the postings' times by 'amount'
function updateTimes(amount){
	"use strict";
	Object.keys(database).forEach(function(e,i,a){
		post = database[e];
		post.ttl -= amount;

		if (post.ttl <= 0){
			removeList[e] = new Date().getTime();
			delete database[e];
		}
	});
}
// Checks postings if they need to be removed
function removeExpired(){
	"use strict";
	var limit = new Date().getTime();
	Object.keys(removeList).forEach(function(e,i,a){
		if (limit - removeList[e] > 30 * updateSpeed){
			delete removeList[e];
		}
	});
}

// Call the function "updateDatabase" every X milliseconds
setInterval(function(){
	updateTimes(updateSpeed);
}, updateSpeed);
// Clean up removeList so that it doesn't get backed up
setInterval(removeExpired, 30 * updateSpeed);

// Client is asking server if any posts have updated
// Client should send an array of message IDs
app.post("/update", function (req, res){
	"use strict";
	var updatedPosts = [];
	var postIds = req.body["postids[]"];
	// If the client has no posts, can't update anything
	if (typeof postIds === "undefined"){
		res.send("0");
		return;
	}
	// For rare case where only one question exists on the client's page, postIds will return
	// a standalone string. Convert this into an array so that we can use forEach on it.
	if (postIds.constructor !== Array) 
		postIds = [postIds];

	// Get array of posting IDs that the client has knowledge of and evaluate it
	postIds.forEach(function(pid, index, array){
		// If the client has this message, send it to be updated on client-side
		if (database[pid] !== undefined){
			updatedPosts.push(database[pid]);
		}
	});
	// Return a JSON object of the available postings
	res.json(updatedPosts);
});

// Client is asking server if any new posts have been added
app.post("/add", function (req, res){
	"use strict";
	var newPosts = {};
	var keys = Object.keys(database);
	// Get client data
	var postIds = req.body["postids[]"];
	var tag = req.body.tag;

	// If the client has no posts
	if (typeof postIds === "undefined"){
		// If requesting a tag, send only messages that have the tag
		if (tag !== ""){
			for (var i = 0; i < keys.length; i++){
				// Get message's tags
				var tags = database[keys[i]].tags;
				for (var j = 0; j < tags.length; j++){
					// Tag is found, add to list and break the loop
					if (tags[j] === tag){
						newPosts[keys[i]] = database[keys[i]];
						break;
					}
				}
			}
		} else { // No tag, so send the entire database
			newPosts = database;
		}
		// Send the messages
		res.json(newPosts);
		return;
	}
	if (postIds.constructor !== Array) 
		postIds = [postIds];
	// If requesting a tag, only get messages that have the tag
	if (tag !== ""){
		for (var i = 0; i < keys.length; i++){
			// Message exists on client side, so skip it
			var old = false;
			for (var k = 0; k < postIds.length; k++){
				// Client already has this message
				if (postIds[k] === keys[i]){
					old = true;
					break;
				}
			}
			if (old) continue;
			// Check each tag
			var tags = database[keys[i]].tags;
			for (var j = 0; j < tags.length; j++){
				// Found tag, add to list and break from loop
				if (tags[j] === tag){
					newPosts[keys[i]] = database[keys[i]];
					break;
				}
			}
		}
	} else { // No tag, so check entire database
		for (var i = 0; i < keys.length; i++){
			// Message exists on client side, so skip it
			var old = false;
			for (var k = 0; k < postIds.length; k++){
				// Client already has this message
				if (postIds[k] === keys[i]){
					old = true;
					break;
				}
			}
			if (!old)
				newPosts[keys[i]] = database[keys[i]];
		}
	}
	// Return remaining posts back to the client
	res.json(newPosts);
});

// Client is asking server if any posts have expired
// Returns array of message IDs that have expired
app.post("/remove", function (req, res){
	"use strict";
	var results = [];
	// Get message IDs and put them in array
	Object.keys(removeList).forEach(function(e, i, a){
		results.push(e);
	});
	res.json(results);
});

// When the user submits a new question
app.post("/question", function(req,res){
	"use strict";
	var message = req.body.message;
	// Check that message is 12 characters
	if (message === "undefined" || message.length < 12){
		res.json(-1);
		return;
	}
	var tags = req.body.tags;
	// Check that there is at least one tag
	if (tags === "undefined"){
		res.json(-2);
		return;
	}
	tags = tags.split(" "); // Puts tags into an array
	var ttl = JSON.parse(req.body.ttl);
	// Add message to database                 get seconds
	posting(new Date().getTime(), ttl * 60, message, tags, []);
	res.json(0);
});

// When the user submits an answer to a question
app.post("/answer", function(req,res){
	"use strict";
	var id = JSON.parse(req.body.id);
	var message = req.body.message;
	// Check if answer is long enough
	if (message === "undefined" || message.length < 12){
		res.json(-1);
		return;
	}
	database[id].comments.push(message);
	if (database[id].ttl < 60000){
		database[id].ttl = 60000;
	}
	res.json(0);
});

