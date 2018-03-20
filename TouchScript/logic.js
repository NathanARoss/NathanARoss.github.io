"use strict";

let itemPoolSize = 0;
let visibleItemCount = 0;
let itemHeight = 50;
let firstLoadedItemIndex = 0;
let firstVisibleItemIndex = 0;
let itemCount = 1000;

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
			
			let table = document.createElement("table");
			let tr = document.createElement("tr");
			table.append(tr);
			div.append(table);
			
			let lastItem = document.createElement("p");
			lastItem.classList.add("append-button");
			div.append(lastItem);
			
			let row = list.childNodes.length + firstLoadedItemIndex;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (row < itemCount) {
				list.insertBefore(div, list.firstChild);
				appendItem(row);
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




function appendItem(row) {
	row = row|0;
	
	let firstChild = list.firstChild;
	list.removeChild(firstChild);
	
	loadRow(row, firstChild);
	list.appendChild(firstChild);
	
}

function prependItem(row) {
	row = row|0;
	
	let lastChild = list.childNodes[list.childNodes.length - 1];
	list.removeChild(lastChild);
	
	loadRow(row, lastChild);
	list.insertBefore(lastChild, list.firstChild);
}




function loadRow(row, rowDiv) {
	row = row|0;
	
	let hash = Math.floor(Math.cos(row * 1234) * 20 + 20) + 1;
	
	let tableRow = rowDiv.firstChild.rows[0];
	
	//remove the items of the table beyond the ones it will need
	let toRemove =  tableRow.cells.length - hash;
	for (let i = 0; i < toRemove; ++i) {
	  tableRow.deleteCell(-1)
	}
	
	//add items to the table until it has enough
	let toAdd = -toRemove;
	for (let i = 0; i < toAdd; ++i) {
	  tableRow.insertCell(-1);
	}
	
	// configure each td within the table with the correct text
	for (let i = 0; i < hash; ++i) {
	  let node = tableRow.cells[i];
	  if (row & 1 == 1)
	    node.innerHTML = "( " + row + ", " + i + ")<br/>odd row";
	  else
	    node.innerHTML = "( " + row + ", " + i + ")";
	}
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