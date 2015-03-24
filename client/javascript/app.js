var main = function () {
    "use strict";

    // Holds all posts that the client can currently see
    // Element format is {'id': Post ID number, 'message': DOM element <div.message>, 'comments': ["string", ...]}
    var posts = [];

    function sortPosts(){
    	posts.sort(function(a, b){
    		if (a.id < b.id) return -1;
    		return 1;
    	})
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
    	seconds -= minutes * 60;
    	if (minutes < 10)
    		minutes = "0" + minutes;
    	if (seconds < 10)
    		seconds = "0" + seconds;
    	return minutes + ":" + seconds;
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
							// Redraw contents to show new comments total count
							getComments(posts[index].message).innerHTML = element.comments.length + " Comments";
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

				console.log({'id': element.id, 'message': $post, 'comments': element.comments});
			});
		});
	}

	function removePosts(){
		$.post("/remove", function(res){
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
		});
	}

	function updateClient(){
		//update times
		updatePosts();
		//remove old items
		removePosts();
		//add new items
		addPosts();
		//readjust scrollbar
	}
	//
	setInterval(updateClient, 100);

};

$(document).ready(main);