"use strict";

let itemPoolSize = 0;
let visibleItemCount = 0;
let itemHeight = 60;
let firstLoadedItemIndex = 0;
let firstVisibleItemIndex = 0;
let itemCount = 1000;

let pPool = [];

let list = document.getElementById("list"); //a div containing all elements
let spacer = document.getElementById("spacer"); //an empty div that changes height to offset elements
let debug = document.getElementById("debug");

const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");
const context = canvas.getContext("2d");
const callInterval = 1000 / 60;

let renderLoop = null;
let time = 0.0;
let error = null;




function resizeListener() {
	visibleItemCount = Math.ceil(window.innerHeight / itemHeight);
	let newItemPoolSize = visibleItemCount + 6;
	newItemPoolSize = Math.min(newItemPoolSize, itemCount);
	let diff = newItemPoolSize - itemPoolSize;
	itemPoolSize = newItemPoolSize;
	
	//allow the viewport to scroll past the end of the list
	document.body.style.height = (itemCount + visibleItemCount - 2) * itemHeight + "px";
	
	if (diff > 0) {
		for(let i = 0; i < diff; ++i) {
			let div = document.createElement("div");
			div.classList.add("row");
			
			let position = list.childNodes.length + firstLoadedItemIndex;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (position < itemCount) {
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
		for (let i = 0; i < diff; ++i) {
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





//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	//user scrolled so far down all items are off screen
	if (firstVisibleItemIndex >= firstLoadedItemIndex + itemPoolSize) {
		//set the first loaded item far above the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex - itemPoolSize - 2;
	}
	
	//user scrolled so far up all items are off screen
	if (firstVisibleItemIndex <= firstLoadedItemIndex - itemPoolSize) {
		//set the first loaded item far below the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex + itemPoolSize;
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
	
	let firstChild = list.firstChild;
	list.removeChild(firstChild);
	
	loadRow(position, firstChild);
	list.appendChild(firstChild);
	
}

function prependItem(position) {
	position = position|0;
	
	let lastChild = list.childNodes[list.childNodes.length - 1];
	list.removeChild(lastChild);
	
	loadRow(position, lastChild);
	list.insertBefore(lastChild, list.firstChild);
}




function loadRow(position, rowDiv) {
	position = position|0;
	
	let hash = Math.floor(Math.cos(position * 1234) * 20 + 20) + 1;
	
	//remove the paragraphs of the div beyond the ones it will need
	let toRemove =  rowDiv.childNodes.length - hash;
	for (let i = 0; i < toRemove; ++i) {
	  let node = rowDiv.childNodes[rowDiv.childNodes.length - 1];
	  rowDiv.removeChild(node);
	  pPool.push(node);
	}
	
	//add paragraphs to the div until it has enough
	let toAdd = -toRemove;
	for (let i = 0; i < toAdd; ++i) {
	  let node = pPool.pop();
	  if (node === undefined) {
	    node = document.createElement("p");
			node.classList.add("item");
	  }
	  rowDiv.appendChild(node);
	}
	
	//configure each paragraph within the div with the correct text
	for (let i = 0; i < hash; ++i) {
	  let node = rowDiv.childNodes[i];
	  if (position & 1 == 1)
	    node.innerHTML = "( " + position + ", " + i + ")<br/>odd row";
	  else
	    node.innerHTML = "( " + position + ", " + i + ")";
	}
	
	//console.log("pool size " + pPool.length);
}




function updateDebug() {
	let debugText = "scrollY: " + Math.floor(window.scrollY) + "<br>"
			+ "loaded items: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + itemPoolSize - 1) + "]<br>"
			+ "visible items: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
	debug.innerHTML = debugText;
}




function hashListener() {
  let hash = window.location.hash;

  //returning to editor
  if (hash === "") {
    setView(editor);

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
    setView(canvas);

    //start render loop
    if (renderLoop === null) {
      time = 0;
      renderLoop = setInterval(draw, callInterval);
      //console.log("starting render loop");
    }
  }
}
hashListener();


function setView(view) {
  document.body.removeChild(editor);
  document.body.removeChild(canvas);
  document.body.appendChild(view);
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