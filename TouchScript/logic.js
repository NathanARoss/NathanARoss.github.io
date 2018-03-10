var screenHeight;
var itemPoolSize = 0;
var visibleItemCount = 0;
let itemHeight = 60;
var firstLoadedItemIndex = 0;
var firstVisibleItemIndex = 0;
let itemCount = 30;

var list = document.getElementById("list"); //a div containing all elements
var spacer = document.getElementById("spacer"); //a div that changes size to offset elements
var debug = document.getElementById("debug");

const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");
const context = canvas.getContext("2d");
const callInterval = 1000 / 60;

let renderLoop = null;
let time = 0.0;
let error = null;




function resizeListener() {
	screenHeight = window.innerHeight;
	document.body.style.height = itemCount * itemHeight + "px";
	
	visibleItemCount = Math.ceil(screenHeight / itemHeight);
	var newItemPoolSize = visibleItemCount + 6;
	newItemPoolSize = Math.min(newItemPoolSize, itemCount);
	var diff = newItemPoolSize - itemPoolSize;
	itemPoolSize = newItemPoolSize;
	
	if (diff > 0) {
		for(var i = 0; i < diff; ++i) {
			var div = document.createElement("div");
			div.classList.add("item");
			
			let position = list.childNodes.length + firstLoadedItemIndex;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (position <= itemCount) {
				list.insertBefore(div, list.firstChild);
				appendItem(position);
			} else {
				list.append(div);
				prependItem(firstLoadedItemIndex - 1);
				--firstLoadedItemIndex;
				spacer.style.height = firstLoadedItemIndex * itemHeight + "px";
			}
		}
	} else if (diff < 0) {
		diff = -diff;
		for (var i = 0; i < diff; ++i) {
			let lastChild = list.childNodes[list.childNodes.length - 1];
			list.removeChild(lastChild);
		}
	}
	
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	updateDebug();

	//resize canvas as well
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	context.clearRect(0, 0, canvas.width, canvas.height);

	console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
}






window.onscroll = function() {
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	//user scrolled so far down all items are off screen
	if (firstVisibleItemIndex >= firstLoadedItemIndex + itemPoolSize) {
		//set the first loaded item far above the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex - itemPoolSize - 2;
		
		let position = firstLoadedItemIndex + itemPoolSize;
		list.childNodes[list.childNodes.length - 1].innerHTML = position;
	}
	
	//user scrolled so far up all items are off screen
	if (firstVisibleItemIndex <= firstLoadedItemIndex - itemPoolSize) {
		//set the first loaded item far below the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex + itemPoolSize;
		
		let position = firstLoadedItemIndex;
		list.firstChild.innerHTML = position;
	}
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleItemIndex - 4 > firstLoadedItemIndex) && (firstLoadedItemIndex < itemCount - itemPoolSize)) {
		appendItem(itemPoolSize + firstLoadedItemIndex);
		++firstLoadedItemIndex;
	}
	
	while ((firstVisibleItemIndex - 2 < firstLoadedItemIndex) && (firstLoadedItemIndex > 0)) {
		prependItem(firstLoadedItemIndex - 1);
		--firstLoadedItemIndex;
	}
	
	spacer.style.height = firstLoadedItemIndex * itemHeight + "px";
	updateDebug();
}




function appendItem(position) {
	position = position|0;
	
	var firstChild = list.firstChild;
	firstChild.innerHTML = fancyElementFunction(position);
	list.removeChild(firstChild);
	list.appendChild(firstChild);
}




function prependItem(position) {
	position = position|0;
	
	var lastChild = list.childNodes[list.childNodes.length - 1];
	lastChild.innerHTML = fancyElementFunction(position);
	list.removeChild(lastChild);
	list.insertBefore(lastChild, list.firstChild);
}




function fancyElementFunction(position) {
	position = position|0;
	
	return position;
}




function updateDebug() {
	var debugText = "scrollY: " + window.scrollY + "<br>"
			+ "loaded items: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + itemPoolSize - 1) + "]<br>"
			+ "visible items: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
	debug.innerHTML = debugText;
}



function hashListener() {
  let hash = window.location.hash;

  //console.log("hash is " + hash); //chop off the first char of the hash

  //returning to editor
  if (hash === "") {
    editor.style.display = "block";
    canvas.style.display = "none";

    //stop render loop
    if (renderLoop !== null) {
      clearInterval(renderLoop);
      renderLoop = null;
      //console.log("stopping render loop");
    }

    //report any errors
    if (error !== null) {
      alert(error);
      error = null;
    }
  }
  
  //returning to canvas
  else {
    editor.style.display = "none";
    canvas.style.display = "block";

    //start render loop
    if (renderLoop === null) {
      time = 0;
      state = null;
      renderLoop = setInterval(draw, callInterval);
      //console.log("starting render loop");
    }
  }
}




function drawCircle(x, y, r) {
  if (typeof x !== "number") {
    throw "Error in drawCircle: 1st parameter must be of type Number";
  }

  if (typeof y !== "number") {
    throw "Error in drawCircle: 2nd parameter must be of type Number";
  }

  if (typeof r !== "number") {
    throw "Error in drawCircle: 3rd parameter must be of type Number";
  }

  context.beginPath();
  context.arc(x,y,r, 0,2*Math.PI);
  context.stroke();
}




function draw() {
	//clear canvas
	context.beginPath();
	context.clearRect(0, 0, canvas.width, canvas.height);

	/*
	try {
	  eval(script.value);
	} catch (err) {
	  //I save it for later so the browser can return to the editor screen before displaying the error
	  error = err;
	  location.hash = ""; //break out of render loop
	}
	/**/
	
	let x = Math.random() * canvas.width;
	let y = Math.random() * canvas.height;
	drawCircle(x, y, 10.0);

	time += 1 / callInterval;
}




//this div element is given a text element child by default, so I get rid of it
list.removeChild(list.firstChild);

resizeListener();
onscroll();