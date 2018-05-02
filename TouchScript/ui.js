"use strict";

let loadedRowCount = 0;
let visibleRowCount = 0;
let rowHeight = 40;
let firstLoadedRowPosition = 0;
let firstVisibleRowPosition = 0;

let list = document.getElementById("list"); //a div containing all elements
let spacer = document.getElementById("spacer"); //an empty div that changes height to offset elements
let debug = document.getElementById("debug");

const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");

let buttonPool = [];

const context = canvas.getContext("2d", { alpha: false });

let renderLoop = 0;
let error = null;
let state = {}; //holds the js version of the script

const script = new Script();



function resizeListener() {
	visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
	let newloadedRowCount = visibleRowCount + 6;
	newloadedRowCount = Math.min(newloadedRowCount, script.getRowCount());
	let diff = newloadedRowCount - loadedRowCount;
	loadedRowCount = newloadedRowCount;
	
	//allow the viewport to scroll past the end of the list
	if (window.location.hash === "")
	  document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  else
    document.body.style.height = "auto";
	
	if (diff > 0) {
		for(let i = 0; i < diff; ++i) {
      let div = createRow();
      let row = list.childNodes.length + firstLoadedRowPosition;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (row < script.getRowCount()) {
				loadRow(row, div);
	      list.appendChild(div);
			} else {
				let row = firstLoadedRowPosition - 1;
				loadRow(row, div);
	      list.insertBefore(div, list.firstChild);
				--firstLoadedRowPosition;
				spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
			}
		}
	} else if (diff < 0) {
		diff = -diff;
		for (let i = 0; i < diff; ++i) {
			let lastChild = list.childNodes[list.childNodes.length - 1];
			prepareForGarbageCollection(lastChild);
			list.removeChild(lastChild);
		}
	}
	
	firstVisibleRowPosition = Math.floor(window.scrollY / rowHeight);
	updateDebug();

	//resize canvas as well
	canvas.width = window.innerWidth * window.devicePixelRatio;
	canvas.height = window.innerHeight * window.devicePixelRatio;
	//console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
	
	if (state && state.onResize)
    state.onResize(canvas.width, canvas.height);
}





//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
	firstVisibleRowPosition = Math.floor(window.scrollY / rowHeight);
	
	/*
	if (firstVisibleRowPosition >= firstLoadedRowPosition + loadedRowCount) {
		firstLoadedRowPosition = firstVisibleRowPosition - loadedRowCount - 2;
	}
	
	if (firstVisibleRowPosition <= firstLoadedRowPosition - loadedRowCount) {
		firstLoadedRowPosition = firstVisibleRowPosition + loadedRowCount;
	}
	/**/
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleRowPosition - 4 > firstLoadedRowPosition) && (firstLoadedRowPosition < script.getRowCount() - loadedRowCount)) {
    let row = loadedRowCount + firstLoadedRowPosition;
    
    let firstChild = list.firstChild;
    list.removeChild(firstChild);
    
    loadRow(row, firstChild);
    list.appendChild(firstChild);
    
		++firstLoadedRowPosition;
	}
	
	while ((firstVisibleRowPosition - 2 < firstLoadedRowPosition) && (firstLoadedRowPosition > 0)) {
		let row = firstLoadedRowPosition - 1;
    
    let lastChild = list.childNodes[list.childNodes.length - 1];
    list.removeChild(lastChild);
    
    loadRow(row, lastChild);
    list.insertBefore(lastChild, list.firstChild);
    
		--firstLoadedRowPosition;
	}
	
	spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
	updateDebug();
}


function createRow() {
	let indentation = document.createElement("button");
	indentation.classList.add("indentation");

  let append = document.createElement("button");
  append.classList.add("append");
  
	let innerRow = document.createElement("div");
	innerRow.classList.add("inner-row");
	innerRow.appendChild(indentation);
  innerRow.appendChild(append);
	
	let outerDiv = document.createElement("div");
	outerDiv.classList.add("outer-row");
  outerDiv.appendChild(innerRow);
  return outerDiv;
}

/* prepare the div for garbage collection by recycling all it's items */
function prepareForGarbageCollection(div) {
  let innerRow = div.firstChild;
  let items = innerRow.childNodes;
	
	for (let i = items.length - 1; i > 1; --i) {
	  let node = items[i];
	  innerRow.removeChild(node);
    buttonPool.push(node);
	}
	
	console.log(`recycling div`);
}




function insertRow(row) {
  //grab an offscreen div to modify, or create a new one if the entire script is on screen
  let rowToModify;
  
  let lastLoaded = firstLoadedRowPosition + loadedRowCount - 1;
  let lastVisible = firstVisibleRowPosition + visibleRowCount - 1;
  if (lastLoaded > lastVisible) {
    rowToModify = list.childNodes[list.childNodes.length - 1];
    list.removeChild(rowToModify);
  }
  else if (firstLoadedRowPosition < firstVisibleRowPosition) {
    rowToModify = list.firstChild;
    list.removeChild(rowToModify);
    ++firstLoadedRowPosition;
  } else {
    //all divs on screen, create a new one
    rowToModify = createRow();
  }
  
  loadRow(row, rowToModify);
  
  
  let positionToInsert = row - firstLoadedRowPosition;
  list.insertBefore(rowToModify, list.childNodes[positionToInsert]);
  
  updateList(positionToInsert + 1);
}

/* move the given row off screen and update its content, or garbage collect it if the entire script is on screen */
function deleteRow(row) {
  let lastLoaded = firstLoadedRowPosition + loadedRowCount - 1;
  let lastVisible = firstVisibleRowPosition + visibleRowCount - 1;
  
  let childToRemove = list.childNodes[row - firstLoadedRowPosition];
  list.removeChild(childToRemove);
  
  //move the removed div either above or below the visible list of items unless the entire script is already loaded
  if (lastLoaded + 1 < script.getRowCount()) {
  	loadRow(row, childToRemove);
	  list.appendChild(childToRemove);
	  console.log(`appending deleted div row ${row} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  }
  else if (firstLoadedRowPosition > 0) {
    loadRow(row, childToRemove);
    list.insertBefore(childToRemove, list.firstChild);
    console.log(`prepending deleted div row ${row} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  } else {
    //if the removed item can't be placed at either end of the list, get rid of it
    prepareForGarbageCollection(childToRemove);
  }
  
  updateList(row - firstLoadedRowPosition);
}



//tell the rows which position they are
function updateList(modifiedRow) {
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    //update the row property of the inner row
    list.childNodes[i].firstChild.row = i + firstLoadedRowPosition;
  }
  
	loadedRowCount = Math.min(visibleRowCount + 6, script.getRowCount());
  
  spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
  document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  
  updateDebug();
}




function loadRow(row, rowDiv) {
	row = row|0;
	
	let itemCount = script.getItemCount(row);
  let innerRow = rowDiv.firstChild;
	innerRow.row = row;
  let items = innerRow.childNodes;
	
	//remove all the item nodes
	//[0] is indentation, [1] is append button
	for (let i = items.length - 1; i > 1; --i) {
	  let lastChild = items[i];
	  innerRow.removeChild(lastChild);
    buttonPool.push(lastChild);
	}
	
	//add new items
	for (let col = 0; col < itemCount; ++col) {
	  const [text, style] = script.getItem(row, col);
    
    let node = getButton(text);
    node.col = col;
	  
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
    
    innerRow.appendChild(node);
	}
	
	const indentation = script.getIndentation(row);
	items[0].style.width = 8 * indentation + "px";
	items[0].style.borderRightWidth =  indentation ? "4px" : "0px";
}


function getButton(text) {
  if (buttonPool.length !== 0) {
    let node = buttonPool.pop();
    node.firstChild.nodeValue = text;
    return node;
  } else {
    let node = document.createElement("button");
    node.classList.add("item");
    node.onclick = buttonClicked;
    node.appendChild(document.createTextNode(text));
    return node;
  }
}



function buttonClicked(event) {
  let button = event.currentTarget;
  
  let row = button.parentElement.row|0;
  let col = button.col|0;
  
  console.log(`button clicked ${row},${col}`);
  
  let response = script.clickItem(row, col);
  if (response.instant) {
	  const [text, style] = response.instant;
    button.firstChild.nodeValue = text;
	  
    if (button.classList.length == 2)
      button.classList.remove(button.classList[1]);
    if (style !== null)
      button.classList.add(style);
  }
}


function updateDebug() {
	let debugText = ""//"scrollY: " + Math.floor(window.scrollY) + "<br>"
			+ "loaded: [" + firstLoadedRowPosition + ", " + (firstLoadedRowPosition + loadedRowCount - 1) + "]<br>"
			+ "visible: [" + firstVisibleRowPosition + ", " + (firstVisibleRowPosition + visibleRowCount - 1) + "]";
	debug.innerHTML = debugText;
}




function hashListener() {
  //returning to editor
  if (window.location.hash === "") {
    setView(editor);

    //stop render loop
    if (renderLoop !== 0) {
      window.cancelAnimationFrame(renderLoop)
      renderLoop = 0;
    }

    //report any errors
    if (error !== null) {
      alert(error);
      error = null;
    }
    
    state = null;
    document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  }
  
  //returning to canvas
  else {
    setView(canvas);

    //start render loop
    if (renderLoop === 0)
      renderLoop = window.requestAnimationFrame(draw);
    
    state = script.getJavaScript(state);
    
  	if (!state.onDraw) {
  	  console.log("state.onDraw() is not defined");
  	  window.location.hash = "";
  	  return;
  	}
  	  	
  	//onResize function is optional
  	if (state.onResize)
  	  state.onResize(canvas.width, canvas.height);
	  
  	//initialize function is optional
  	if (state.initialize)
  	  state.initialize();
    
    document.body.style.height = "auto";
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




function draw(timestamp) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  state.onDraw(timestamp);
	
	renderLoop = window.requestAnimationFrame(draw);
}

resizeListener();