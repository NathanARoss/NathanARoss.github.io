"use strict";

let itemPoolSize = 0;
let visibleItemCount = 0;
let itemHeight = 40;
let firstLoadedItemIndex = 0;
let firstVisibleItemIndex = 0;

let list = document.getElementById("list"); //a div containing all elements
let spacer = document.getElementById("spacer"); //an empty div that changes height to offset elements
let debug = document.getElementById("debug");

const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");

let itemPool = [];

const context = canvas.getContext("2d");
const callInterval = 1000 / 60;

let renderLoop = null;
let time = 0.0;
let error = null;
let state = {}; //holds the js version of the script


function resizeListener() {
  let rowCount = getRowCount();
  
	visibleItemCount = Math.ceil(window.innerHeight / itemHeight);
	let newItemPoolSize = visibleItemCount + 6;
	newItemPoolSize = Math.min(newItemPoolSize, rowCount);
	let diff = newItemPoolSize - itemPoolSize;
	itemPoolSize = newItemPoolSize;
	
	//allow the viewport to scroll past the end of the list
	document.body.style.height = (rowCount + visibleItemCount - 2) * itemHeight + "px";
	
	if (diff > 0) {
		for(let i = 0; i < diff; ++i) {
			let div = document.createElement("div");
			div.classList.add("row");
      
      let divContent = document.createElement("div");
      divContent.classList.add("row-content");
			
			let appendButton = document.createElement("button");
			appendButton.classList.add("append-button");
			divContent.append(appendButton);
			
			let indentation = document.createElement("button");
			indentation.classList.add("indentation");
			divContent.append(indentation);
      
      div.append(divContent);

			
			let row = list.childNodes.length + firstLoadedItemIndex;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (row < rowCount) {
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
	//console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
	
	if (state && state.onResize)
    state.onResize(window.innerWidth, window.innerHeight);
}





//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	/*
	if (firstVisibleItemIndex >= firstLoadedItemIndex + itemPoolSize) {
		firstLoadedItemIndex = firstVisibleItemIndex - itemPoolSize - 2;
	}
	
	if (firstVisibleItemIndex <= firstLoadedItemIndex - itemPoolSize) {
		firstLoadedItemIndex = firstVisibleItemIndex + itemPoolSize;
	}
	/**/
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleItemIndex - 4 > firstLoadedItemIndex) && (firstLoadedItemIndex < getRowCount() - itemPoolSize)) {
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
	
	let itemCount = getItemCount(row);
  let rowContent = rowDiv.firstChild;
	
	//remove the items of the table beyond the ones it will need
	// the first node is the + button, the second node is the indentation
	let toRemove =  rowContent.childNodes.length - 2 - itemCount;
	for (let i = 0; i < toRemove; ++i) {
	  let lastChild = rowContent.childNodes[rowContent.childNodes.length - 1];
	  rowContent.removeChild(lastChild);
	  itemPool.push(lastChild);
	}
	
	//add items until it has enough
	let toAdd = -toRemove;
	for (let i = 0; i < toAdd; ++i) {
	  let newButton;
	  if (itemPool.length === 0) {
  	  newButton = document.createElement("button");
  	  newButton.classList.add("item");
  	  newButton.addEventListener('click', itemClicked, true);
	  } else {
	    newButton = itemPool.pop();
	  }
	  newButton.col = rowContent.childNodes.length - 2;
	  rowContent.append(newButton)
	}
	
	// configure each item with the correct text
	for (let i = 0; i < itemCount; ++i) {
    let node = rowContent.childNodes[i + 2];
    node.innerHTML = getItem(row, i);
	  node.row = row;
	}
	
	rowContent.childNodes[1].style.width = 10 * getIndentation(row) + "px";
}



function itemClicked(event) {
  let button = event.currentTarget;
  let row = button.row;
  let col = button.col;
  
  
}




function updateDebug() {
	let debugText = ""//"scrollY: " + Math.floor(window.scrollY) + "<br>"
			+ "loaded: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + itemPoolSize - 1) + "]<br>"
			+ "visible: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
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
    
    state = null;
    document.body.style.height = (getRowCount() + visibleItemCount - 2) * itemHeight + "px";
  }
  
  //returning to canvas
  else {
    setView(canvas);

    //start render loop
    if (renderLoop === null) {
      renderLoop = setInterval(draw, callInterval);
      //console.log("starting render loop");
    }
    
    time = 0;
    
    let scriptJS = getJavaScript();
    state = {};
    scriptJS(state);
    
  	if (!state.onDraw) {
  	  console.log("state.onDraw() is not defined");
  	  window.location.hash = "";
  	}
  	  	
  	//onResize function is optional
  	if (state.onResize)
  	  state.onResize(window.innerWidth, window.innerHeight);
	  
  	//initialize function is optional
  	if (state.initialize)
  	  state.initialize();
    
    document.body.style.height = window.innerHeight + "px";
  }
}
hashListener();


function setView(view) {
  if (editor.parentNode === document.body)
    document.body.removeChild(editor);
  
  if (canvas.parentNode === document.body)
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
  context.strokeStyle="#FFFFFF";
  context.arc(x,y,r, 0,2*Math.PI);
  context.stroke();
}




function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  state.onDraw(time);
	time += 1 / callInterval;
}

resizeListener();