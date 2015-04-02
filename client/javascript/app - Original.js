// If true, does not call addPosts(). Turns true when viewing a question's comments.
var blockNewMessages = false;
// The ID of the question that the user is commenting on
var commentingOnID = -1;


// Loaded when HTML page is loaded
var main = function () {
	"use strict";

	// Holds all posts that the client can currently see
	// Element format is {'id': Post ID number, 'message': DOM element <div.message>, 'comments': ["string", ...]}
	var posts = [];

	function sortPosts(){
		posts.sort(function(a, b){
			if (a.id < b.id) return -1;
			return 1;
		});
	}

	function getPostIDs(){
		var contents = [];
		posts.forEach(function(element, index, array){
			contents.push(element.id);
		});
		return contents;
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
		//console.log(getPostIDs());
		// Send the server the message IDs to get updated data for them (timer and new comments)
		$.post("/update", {'postids': getPostIDs()}, function(res){
			res.forEach(function(element, index, array){
				// CHeck client's posts
				for (var i = 0; i < posts.length; i++){
					// If the post has the same ID
					if (posts[i].id === element.id){
						// Find timer element in posting and update with new time
						getTime(posts[i].message).innerHTML = msToClock(element.ttl);
						// Find comments element in posting and update with new comments (if any)
						if (posts[i].comments.length !== element.comments.length){
							// Update to new comments
							posts[i].comments = element.comments;
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
								getComments(posts[index].message).innerHTML = element.comments.length + " Comments";
							}
						}
						break;
					}
				}
			});
		});
	}

	// Create a new DOM element for each new post
	function addPosts(){
		$.post("/add", {'postids': getPostIDs()}, function(res){
			res.forEach(function(element, index, array){
				// Get question
				var $post = $("<div>").html("<i>" + element.question + "</i>").attr("id", element.id).addClass("post");
				// Apply tags
				var tagstr = "Tags: ";
				element.tags.forEach(function(e, i, a){
					if (i === 0)
						tagstr += e;
					else
						tagstr += ", " + e;
				});
				var $tags = $("<p>").text(tagstr);
				// Display timer
				var $ttl = $("<div>").text(msToClock(element.ttl)).addClass("time");
				// Indicate number of comments made to the question
				var $comments = $("<div>").text(element.comments.length + " Comments").addClass("comments");
				
				// Combines all the elements together to form a single element
				$post.append($tags, $ttl, $comments);
				// Adds the message to the queue
				$("div.messages").append($post);
				// Adds this message to the list
				posts.push({'id': element.id, 'message': $post, 'comments': element.comments});
				// Allow clicking on the comments element
				$comments.on("click", function(){
					var msgID = JSON.parse($(this).parent().attr("id"));
					var comments;
					var index = 0;
					var post;
					// Find the message that is associated with this comment element
					for (index; index < posts.length; index++){
						if (posts[index].id === msgID){
							comments = posts[index].comments;
							break;
						}
					}
					// Go to new page with just this message
					blockNewMessages = true;
					post = posts[index];
					commentingOnID = msgID;
					
					// Clear out message queue and only show the one message we are interested in
					$("div.messages").empty();
					$("div.messages").append(post.message);
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
							$("textarea.answer").val('');
						});
					});
					// Append DOM elements for the textarea and submit button
					$("div.answer-field").append("<h1 class='answer'>Reply to Question</h1>", $textarea, "<br><br>", $submitAnswerBtn);

					// Temporarily change the button to a Back button
					$("input.newQuestion").removeClass("btn-success").addClass("btn-primary").val('Back');
				});

				//console.log({'id': element.id, 'message': $post, 'comments': element.comments});
			});
		});
	}

	function removePosts(){
		$.post("/remove", function(res){
			// If viewing a question's comments
			if (blockNewMessages){
				res.forEach(function(element, index, array){
					// If the question has expired, return to homepage
					if (element.id === commentingOnID)
						goToHomePage();
				});
			} else {
				res.forEach(function(element, index, array){
					for (var i = 0; i < posts.length; i++){
						// If the client still has data of an expired post, remove it
						if (element.id === posts[i].id){
							// Find message DOM and delete it
							$("#" + element.id).remove();

							break;
						}
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
		//readjust scrollbar
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
		window.location.reload();
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
			if ($("textarea.question").val().length <= 12){
				alert("Please input more than 12 characters for a question.");
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
				// Return to home page
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

};

$(document).ready(main);