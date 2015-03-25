// Initial setup for server
var http = require('http'),
	express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	updateSpeed = 100; // Calls the main update function this many milliseconds

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

// Creates a JSON object for each post
function posting(id, ttl, question, tags, comments){
	// If no time stamp assigned to message, assign default ID (for initializing the server with data)
	if (id === null){
		id = temp_id;
		temp_id++;
	}
	return {"id": id, "ttl": ttl * 1000, "question": question, "tags": tags, "comments": comments};
}

// Initialize server with data to simulate a database
var initialize_data = [
	posting(null, 15, "This is a quick one", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 40, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 50, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 3600, "How do I shot web?", ["lol", "shrekt", "spideymanz"], ["wtf is this gtfo nooob", "Please ask a serious question next time..."]),
	posting(null, 60, "I'm trying to get my server running via node.js but it's not working. Any pointers?", ["node","server","computer science","programming","web"], []),
	posting(null, 30, "Quick! I don't know what wire to cut! The red one? Or the blue one? I don't want to dieeeeeeeeeeee!!!", ["important","life or death"], ["It's always the red one", "Yeah, do it faggot!", "OMFG it was the red one! THANK YOU SO MUCH!", "np ;)"])
];
// Database of all messages
// Add initial data to database
var database = initialize_data;
// Array to be referenced to of posts that have expired
// Elements are [posting, Date()]
var removeList = [];

// A function that is called constantly by the server to reduce the postings' times by 'amount'
function updateTimes(amount){
	var i = 0;
	for (i; i < database.length; i++){
		post = database[i];
		post.ttl -= amount;
		if (post.ttl <= 0){
			removeList.push([post, new Date().getTime()]);
			database.splice(i, 1);
			i--;
		}
	}
}
// Checks postings if they need to be removed
function removeExpired(){
	var limit = new Date().getTime();
	var i = 0;
	for (i; i < removeList.length; i++){
		if (limit - removeList[i][1] > 300 * updateSpeed){
			removeList.splice(i, 1);
			i--;
		}
	}
}
// Main update function that the server calls on a steady interval
function updateDatabase(){
	updateTimes(updateSpeed);
}
// Call the function "updateDatabase" every X milliseconds
setInterval(updateDatabase, updateSpeed);
// Clean up removeList so that it doesn't get backed up
setInterval(removeExpired, 300 * updateSpeed);

app.post("/update", function (req, res){
	var updatedPosts = [];
	var postIds = req.body['postids[]'];
	// If the client has no posts
	if (typeof postIds === 'undefined')
		return;
	// Get array of posting IDs that the client has knowledge of and evaluate it
	postIds.forEach(function(pid, index, array){
		for (var i = 0; i < database.length; i++){
			if (database[i].id === JSON.parse(pid)){
				updatedPosts.push(database[i]);
				break;
			}
		}
	});
	// Return a JSON object of the available postings
	res.json(updatedPosts);
});

app.post("/add", function (req, res){
	var newPosts = [];
	var postIds = req.body['postids[]'];
	// If the client has no posts
	if (typeof postIds === 'undefined'){
		res.json(database);
		return;
	}
	for (var i = 0; i < database.length; i++){
		// Get array of posting IDs that the client has knowledge of and evaluate it
		for (var j = 0; j < postIds.length; j++){
			// Found this ID, so it's not new to the client
			if (database[i].id === JSON.parse(postIds[j])){
				break;
			}
			// Evaluated entire array, did not find new 
			if (j === postIds.length - 1)
				newPosts.push(database[i]);
		}
	}
	res.json(newPosts);
});

app.post("/remove", function (req, res){
	var results = [];
	removeList.forEach(function(e, i, a){
		results.push(e[0]);
	});
	res.json(results);
});

// When the user submits a new question
app.post("/question", function(req,res){
	var message = req.body.message;
	var tags = req.body.tags.split(" "); // Put tags into array form
	var ttl = JSON.parse(req.body.ttl);
	// Add message to database                 get seconds
	database.push(posting(new Date().getTime(), ttl * 60, message, tags, []));
	res.json(0);
});

// When the user submits an answer to a question
app.post("/answer", function(req,res){
	var id = JSON.parse(req.body.id);
	var message = req.body.message;
	for (var i = 0; i < database.length; i++){
		if (database[i].id === id){
			database[i].comments.push(message);
		}
	}
	res.json(0);
});

