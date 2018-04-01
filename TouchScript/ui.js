"use strict";

let buttonPoolSize = 0;
let visibleItemCount = 0;
let itemHeight = 40;
let firstLoadedItemIndex = 0;
let firstVisibleItemIndex = 0;

let list = document.getElementById("list"); //a div containing all elements
let spacer = document.getElementById("spacer"); //an empty div that changes height to offset elements
let debug = document.getElementById("debug");

const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");

let buttonPool = [];
let selectPool = [];

const context = canvas.getContext("2d", { alpha: false });
const callInterval = 1000 / 60;

let renderLoop = 0;
let error = null;
let state = {}; //holds the js version of the script



function resizeListener() {
  let rowCount = getRowCount();
  
	visibleItemCount = Math.ceil(window.innerHeight / itemHeight);
	let newbuttonPoolSize = visibleItemCount + 6;
	newbuttonPoolSize = Math.min(newbuttonPoolSize, rowCount);
	let diff = newbuttonPoolSize - buttonPoolSize;
	buttonPoolSize = newbuttonPoolSize;
	
	//allow the viewport to scroll past the end of the list
	if (window.location.hash === "")
	  document.body.style.height = (rowCount + visibleItemCount - 2) * itemHeight + "px";
  else
    document.body.style.height = "auto";
	
	if (diff > 0) {
		for(let i = 0; i < diff; ++i) {
			let div = document.createElement("div");
			div.classList.add("row");
      
      let divContent = document.createElement("div");
      divContent.classList.add("row-content");
			
			let appendButton = document.createElement("button");
			appendButton.classList.add("append-button");
			
      let select = getSelect();
      select.innerHTML = `<option>New line</option><option>Delete line</option>`;
      appendButton.append(select);
			
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
	canvas.width = window.innerWidth * window.devicePixelRatio;
	canvas.height = window.innerHeight * window.devicePixelRatio;
	//console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
	
	if (state && state.onResize)
    state.onResize(canvas.width, canvas.height);
}





//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	/*
	if (firstVisibleItemIndex >= firstLoadedItemIndex + buttonPoolSize) {
		firstLoadedItemIndex = firstVisibleItemIndex - buttonPoolSize - 2;
	}
	
	if (firstVisibleItemIndex <= firstLoadedItemIndex - buttonPoolSize) {
		firstLoadedItemIndex = firstVisibleItemIndex + buttonPoolSize;
	}
	/**/
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleItemIndex - 4 > firstLoadedItemIndex) && (firstLoadedItemIndex < getRowCount() - buttonPoolSize)) {
		appendItem(buttonPoolSize + firstLoadedItemIndex);
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
	  recycleButton(lastChild);
	}
	
	//update existing nodes
	for (let i = 2; i < rowContent.childNodes.length; ++i) {
	  let node = rowContent.childNodes[i];
	  const [text, style, dropdown] = getItem(row, i - 2);
	  
	  if (dropdown) {
	    let select;
	    if (node.childNodes.length !== 0) {
	      let lastChild = node.childNodes[node.childNodes.length - 1];
	      if (lastChild.tagName === "SELECT")
	        select = lastChild;
        else
          select = getSelect();
	    }
	    
	    select.innerHTML = `<option>${text}</option>`;
	    node.innerHTML = text;
	    node.appendChild(select);
	  }
	  
	  //if there shouldn't be a node and there is, remove it
	  else if (node.childNodes.length !== 0) {
	    let lastChild = node.childNodes[node.childNodes.length - 1];
	    if (lastChild.tagName === "SELECT") {
        node.removeChild(lastChild);
        recycleSelect(lastChild);
      }
      
      node.innerHTML = text;
    }
    
    node.row = row;
    
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
	}
	
	//add new items
	let toAdd = -toRemove;
	for (let i = 0; i < toAdd; ++i) {
    let node = getButton();
    node.col = rowContent.childNodes.length - 2;
    
	  const [text, style, dropdown] = getItem(row, node.col);
    node.innerHTML = text;
    
    if (dropdown) {
      let select = getSelect();
      select.innerHTML = `<option>${text}</option>`;
      node.append(select);
    }
    
    rowContent.append(node);
    node.row = row;
	  
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
	}
	
	const indentation = getIndentation(row);
	rowContent.childNodes[1].style.width = Math.max(0, 10 * indentation - 2) + "px";
	rowContent.childNodes[1].style.borderRightWidth =  indentation ? "2px" : "0px";
}


function getButton() {
  if (buttonPool.length !== 0) {
    return buttonPool.pop();
  } else {
    let newButton = document.createElement("button");
    newButton.classList.add("item");
    newButton.addEventListener('click', elementClicked, true);
    return newButton;
  }
}

function getSelect() {
  if (selectPool.length !== 0) {
    return selectPool.pop();
  } else {
    let newSelect = document.createElement("select");
    newSelect.classList.add("hidden-select");
    return newSelect;
  }
}

function recycleButton(button) {
  button.removeEventListener('click', elementClicked);

  if (button.childNodes.length !== 0) {
    let lastChild = button.childNodes[button.childNodes.length - 1];
    if (lastChild.tagName === "SELECT")
      recycleSelect(lastChild);
  }
  
  button.innerHTML = "";
  buttonPool.push(button);
}

function recycleSelect(select) {
  select.innerHTML = "";
  selectPool.push(select);
}



function elementClicked(event) {
  let button = event.currentTarget;
  
  let row = button.row|0;
  let col = button.col|0;
  
  let response = itemClicked(row, col);
  if (response.instant) {
    const [text, style] = response.instant;
    button.innerHTML = text;
    
    if (button.classList.length == 2)
      button.classList.remove(button.classList[1]);
    if (style !== null)
      button.classList.add(style);
  }
}

/*
document.addEventListener('keydown', (event) => {
  const keyName = event.key;
  console.log(keyName);
  
  
}, false);


list.addEventListener('touchmove', function(event) {
  event.preventDefault();
}, false);
/**/



function updateDebug() {
	let debugText = ""//"scrollY: " + Math.floor(window.scrollY) + "<br>"
			+ "loaded: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + buttonPoolSize - 1) + "]<br>"
			+ "visible: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
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
    document.body.style.height = (getRowCount() + visibleItemCount - 2) * itemHeight + "px";
  }
  
  //returning to canvas
  else {
    setView(canvas);

    //start render loop
    if (renderLoop === 0)
      renderLoop = window.requestAnimationFrame(draw);
    
    let scriptFunction = getJavaScript();
    state = {};
    scriptFunction(state);
    
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