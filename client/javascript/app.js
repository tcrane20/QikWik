// If true, does not call addPosts(). Turns true when viewing a question's comments.
var blockNewMessages = false;
// The ID of the question that the user is commenting on
var commentingOnID = -1;
// Filter messages based on searched tag
var tagFilter = "";


// Loaded when HTML page is loaded
var main = function () {
	"use strict";

	// Holds all posts that the client can currently see
	// Element format is {'message': DOM element <div.message>, 'comments': ["string", ...]}
	var posts = new Object();

	function sortPosts(){
		posts.sort(function(a, b){
			if (a.id < b.id) return -1;
			return 1;
		});
	}

	function getPostIDs(){
		return Object.keys(posts);
	}

	function msToClock(ms){
		var seconds = Math.floor(ms / 1000);
		var minutes = Math.floor(seconds / 60);
		var hours = Math.floor(minutes / 60);
		seconds -= minutes * 60;
		minutes -= hours * 60;
		if (hours < 10)
			hours = "0" + hours;
		if (minutes < 10)
			minutes = "0" + minutes;
		if (seconds < 10)
			seconds = "0" + seconds;
		return hours + ":" + minutes + ":" + seconds;
	}

	function getTime(message){
		var children = message.children();
		var child;
		for (var i = 0; i < children.length; i++){
			if (children[i].className === "time"){
				return children[i];
			}
		}
	}

	function getComments(message){
		var children = message.children();
		var child;
		for (var i = 0; i < children.length; i++){
			if (children[i].className === "comments"){
				return children[i];
			}
		}
	}

	// Updates the timer element on each visible post
	function updatePosts(){
		// Send the server the message IDs to get updated data for them (timer and new comments)
		$.post("/update", {'postids': getPostIDs()}, function(res){
			if (res === '0') return;
			res.forEach(function(element, index, array){
				if (posts[element.id] !== undefined){
					var post = posts[element.id];
					getTime(post.message).innerHTML = msToClock(element.ttl);

					//////TESTING
					if (element.ttl < 60000){
						$(getTime(post.message)).css("color", "red");
						$(getTime(post.message)).trigger("startRumble");
					}

					// Find comments element in posting and update with new comments (if any)
					if (post.comments.length !== element.comments.length){
						// Update to new comments
						post.comments = element.comments;
						// If currently viewing the comments section for one question (and not the entire list of questions)
						if (blockNewMessages){
							$("div.comment-strings").empty();
							// Draw the comments
							for (var j = 0; j < element.comments.length; j++){
								var $comment = $("<div class='comment-msg'>").text("Answer # " + (j+1) + ": " + element.comments[j]);
								$("div.comment-strings").append($comment);
							}
						}
						else{
							// Redraw contents to show new comments total count
							getComments(post.message).innerHTML = element.comments.length + " Comments";
						}
					}
				}
			});
		});
	}

	// Create a new DOM element for each new post
	function addPosts(){
		$.post("/add", {'postids': getPostIDs(), 'tag': tagFilter}, function(res){
			Object.keys(res).forEach(function(ele, index, array){
				var element = res[ele];
				// Get question
				var $post = $("<div>").html("<i>" + element.question + "</i>").attr("id", element.id).addClass("post");
				// Apply tags
				var $tags = $("<p>").text("Tags: ");
				element.tags.forEach(function(e, i, a){
					var $tagbutton = $("<button>").text(e).on("click", function(){
						tagFilter = e;
   						goToHomePage();
					});
					$tags.append($tagbutton);
				});
				
				// Display timer and give rumble properties
				var $ttl = $("<div>").text(msToClock(element.ttl)).addClass("time");
				$ttl.jrumble({
					x: 3,
					y: 3,
					rotation: 2
				});
				// Indicate number of comments made to the question
				var $comments = $("<div>").text(element.comments.length + " Comments").addClass("comments");
				
				// Combines all the elements together to form a single element
				$post.append($tags, $ttl, $comments);
				// Adds the message to the queue
				$("div.messages").append($post);
				// Adds this message to the list
				posts[ele] = {'message': $post, 'comments': element.comments};
				// Allow clicking on the comments element
				$comments.on("click", function(){
					var msgID = $(this).parent().attr("id");
					var post = posts[$(this).parent().attr("id")];
					var comments = post.comments;

					// Go to new page with just this message
					blockNewMessages = true;
					commentingOnID = msgID;
					
					// Clear out message queue and only show the one message we are interested in
					$("div.messages").empty();
					$("div.messages").append(post.message);

					//JRUMBLE TEST
					$(getTime(post.message)).jrumble();
					$(getTime(post.message)).trigger("stopRumble");


					// Also, create a new div that will hold all the comment messages and text field for submitting answers
					$("div.messages").append($("<div class='comment-strings'>"));
					$("div.messages").append($("<div class='answer-field'>"));
					// Hide the div.comments as we don't need it right now
					$("div.comments").css({display: "none"});
					// Draw the comments
					for (index = 0; index < post.comments.length; index++){
						var $comment = $("<div class='comment-msg'>").text("Answer # " + (index+1) + ": " + post.comments[index]);
						$("div.comment-strings").append($comment);
					}
					// Create text area to allow user to reply back
					var $textarea = $("<textarea rows='5' cols='80' class='answer'>");
					// Button for submitting answer to the server as well as its onClick action
					var $submitAnswerBtn = $("<input class='btn btn-success submitAnswer' type='submit' value='Post Answer'>");
					$submitAnswerBtn.on("click", function(){
						// If textarea does not have enough characters
						if ($("textarea.answer").val().length <= 12){
							alert("Please input more than 12 characters for an answer.");
							return;
						}
						// Submit answer to server. Upon success, clears out text field
						$.post("/answer", {'id': msgID, 'message': $("textarea.answer").val()}, function(res){
							if (res === '-1')
								alert("Please input more than 12 characters for an answer.");
							else
								$("textarea.answer").val('');
						});
					});
					// Append DOM elements for the textarea and submit button
					$("div.answer-field").append("<h1 class='answer'>Reply to Question</h1>", $textarea, "<br><br>", $submitAnswerBtn);

					// Temporarily change the button to a Back button
					$("input.newQuestion").removeClass("btn-success").addClass("btn-primary").val('Back');
				});

			});
		});
	}

	function removePosts(){
		$.post("/remove", function(res){
			// If viewing a question's comments
			if (blockNewMessages){
				res.forEach(function(element, index, array){
					// If the question has expired, remove timer and disable sending answers
					if (element === commentingOnID){
						// Remove timer DOM
						$("div.time").remove();
						// Disable the button to prevent inputting anymore answers (I don't get why the jQuery is returning an array)
						$("input.submitAnswer")[0].disabled = true;
					}
				});
			} else { // Home page
				res.forEach(function(element, index, array){
					// Explode the DOM element and delete it when finished
					if (posts[element] !== undefined) {
						$("#" + element).hide("explode", {complete: function(){
							$("#" + element).remove();
						}});
						// Remove post from client's list
						delete posts[element];
					}
				});
			}
		});
	}

	function updateClient(){
		//update times
		updatePosts();
		//remove old items
		removePosts();
		//add new items
		if (!blockNewMessages) addPosts();
	}
	//
	setInterval(updateClient, 1000);

	function goToHomePage(){
		// CLear posts and allow new messages to come in
		posts = [];
		blockNewMessages = false;
		// Delete DOM elements
		$("div.messages").empty();
		$("div.newQuestionForm").empty();
		// Unhide messages
		$("div.messages").css({display: "block"});
		// Change Back button to New Question button
		$("input.newQuestion").removeClass('btn-primary').addClass('btn-success').val('New Question');
		// Refresh page
		addPosts();
		updatePosts();
	}

	$("input.newQuestion").on("click", function(){
		// User is already on the question form; do nothing
		if ($("input.newQuestion").hasClass('btn-primary'))
		{
			goToHomePage();
			return;
		}
		// Hides the messages
		$("div.messages").css({display: "none"});
		// Create DOM elements (textarea, text input, submit button)
		var $textarea = $("<textarea rows='5' cols='80' class='question'>");
		var $tagbox = $("<input class='tagbox' type='text'>");
		var $numInput = $("<input class='duration' type='number' min='5' max='720' value='5'>");

		// Button for submitting question to the server as well as its onClick action
		var $submitQuestionBtn = $("<input class='btn btn-success submitQuestion' type='submit' value='Post Question'>");

		$submitQuestionBtn.on("click", function(){
			// If textarea does not have enough characters
			if ($("textarea.question").val().length < 12){
				alert("Please input at least 12 characters for a question.");
				return;
			}
			// If tag box is empty
			if ($("input.tagbox").val().length === 0){
				alert("Please include at least one tag.");
				return;
			}
			// If duration is too long or short
			if ($("input.duration").val() < 5 || $("input.duration").val() > 720){
				alert("Messages may only have a duration between 5 and 720 minutes.");
				return;
			}

			// Submit question to server. Upon success, removes question form and returns to posted messages
			$.post("/question", {'message': $("textarea.question").val(), 'tags': $("input.tagbox").val(), 'ttl': $("input.duration").val()}, function(res){
				if (res === '-1')
					alert("Please input at least 12 characters for a question.");
				else if (res === '-2')
					alert("Please include at least one tag.");
				else
					goToHomePage();
			});
		});

		// Append DOMs
		$("div.newQuestionForm").append("<h1 class='question'>Ask a Question</h1>", $textarea);
		$("div.newQuestionForm").append("<br><br><br><br><br><br>Tags: ", $tagbox);
		$("div.newQuestionForm").append("<br><br>Minutes to Live: ", $numInput);
		$("div.newQuestionForm").append("<br><br>", $submitQuestionBtn);

		// Temporarily change the button to a Back button
		$("input.newQuestion").removeClass("btn-success").addClass("btn-primary").val('Back');
	});
	
	// Search button is clicked
	$("#SButton").click(function(event){
		event.preventDefault();
        tagFilter = $("#SText").val();
        goToHomePage();
	});

	// Load the interface with database messages
	addPosts();
	updatePosts();
};

$(document).ready(main);