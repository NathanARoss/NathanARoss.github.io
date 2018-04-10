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
let selectPool = [];

const context = canvas.getContext("2d", { alpha: false });

let renderLoop = 0;
let error = null;
let state = {}; //holds the js version of the script



function resizeListener() {
  let rowCount = getRowCount();
  
	visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
	let newloadedRowCount = visibleRowCount + 6;
	newloadedRowCount = Math.min(newloadedRowCount, rowCount);
	let diff = newloadedRowCount - loadedRowCount;
	loadedRowCount = newloadedRowCount;
	
	//allow the viewport to scroll past the end of the list
	if (window.location.hash === "")
	  document.body.style.height = (rowCount + visibleRowCount - 2) * rowHeight + "px";
  else
    document.body.style.height = "auto";
	
	if (diff > 0) {
		for(let i = 0; i < diff; ++i) {
      let div = createDiv();
      let row = list.childNodes.length + firstLoadedRowPosition;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (row < rowCount) {
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
			recycleDiv(lastChild);
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
	while ((firstVisibleRowPosition - 4 > firstLoadedRowPosition) && (firstLoadedRowPosition < getRowCount() - loadedRowCount)) {
		appendDiv(loadedRowCount + firstLoadedRowPosition);
		++firstLoadedRowPosition;
	}
	
	while ((firstVisibleRowPosition - 2 < firstLoadedRowPosition) && (firstLoadedRowPosition > 0)) {
		prependDiv(firstLoadedRowPosition - 1);
		--firstLoadedRowPosition;
	}
	
	spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
	updateDebug();
}


function createDiv() {
	let div = document.createElement("div");
	div.classList.add("row");
  
  let divContent = document.createElement("div");
  divContent.classList.add("row-content");
	
  let select = document.createElement("select");
  select.classList.add("append");
  select.addEventListener('change', appendChanged, true);
  select.innerHTML =
`<option disabled selected style="display:none;"></option>
<option>New line</option>
<option>Delete line</option>`;
	
	divContent.append(select);
	
	let indentation = document.createElement("button");
	indentation.classList.add("indentation");
	divContent.append(indentation);
  
  div.append(divContent);
  
  return div;
}

function recycleDiv(divToRemove) {
  let rowDiv = divToRemove.firstChild;
  let rowNodes = rowDiv.childNodes;
	
	let toRemove =  rowNodes.length;
	for (let i = 2; i < toRemove; ++i) {
	  let lastChild = rowNodes[rowNodes.length - 1];
	  rowDiv.removeChild(lastChild);
	  recycleButton(lastChild);
	}
	rowDiv.removeEventListener('change', appendChanged);
	
	console.log(`recycling div`);
}




function appendDiv(row) {
	let firstChild = list.firstChild;
	list.removeChild(firstChild);
	
	loadRow(row, firstChild);
	list.appendChild(firstChild);
}

function prependDiv(row) {
	let lastChild = list.childNodes[list.childNodes.length - 1];
	list.removeChild(lastChild);
	
	loadRow(row, lastChild);
	list.insertBefore(lastChild, list.firstChild);
}

function insertDiv(row) {
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
    rowToModify = createDiv();
  }
  
  loadRow(row, rowToModify);
  
  
  let positionToInsert = row - firstLoadedRowPosition;
  list.insertBefore(rowToModify, list.childNodes[positionToInsert]);
  
  updateList(positionToInsert + 1);
}

function deleteDiv(row) {
  let lastLoaded = firstLoadedRowPosition + loadedRowCount - 1;
  let lastVisible = firstVisibleRowPosition + visibleRowCount - 1;
  
  let childToRemove = list.childNodes[row - firstLoadedRowPosition];
  list.removeChild(childToRemove);
  
  //move the removed div either above or below the visible list of items unless the entire script is already loaded
  if (lastLoaded + 1 < getRowCount()) {
  	loadRow(row, childToRemove);
	  list.appendChild(childToRemove);
	  console.log(`appending deleted div row ${row} rowCount ${getRowCount()} lastLoaded ${lastLoaded}`);
  }
  else if (firstLoadedRowPosition > 0) {
    loadRow(row, childToRemove);
    list.insertBefore(childToRemove, list.firstChild);
    console.log(`prepending deleted div row ${row} rowCount ${getRowCount()} lastLoaded ${lastLoaded}`);
  } else {
    //if the removed item can't be placed at either end of the list, get rid of it
    recycleDiv(childToRemove);
  }
  
  updateList(row - firstLoadedRowPosition);
}



function updateList(modifiedRow) {
  //tell the rows which position they are
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    list.childNodes[i].firstChild.row = i + firstLoadedRowPosition;
  }
  
	loadedRowCount = Math.min(visibleRowCount + 6, getRowCount());
  
  spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
  document.body.style.height = (getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  
  updateDebug();
}




function loadRow(row, rowDiv) {
	row = row|0;
	
	let itemCount = getItemCount(row);
  rowDiv = rowDiv.firstChild;
  let rowNodes = rowDiv.childNodes;
	
	//remove the items of the table beyond the ones it will need
	// the first node is the + button, the second node is the indentation
	let toRemove =  rowNodes.length - 2 - itemCount;
	for (let i = 0; i < toRemove; ++i) {
	  let lastChild = rowNodes[rowNodes.length - 1];
	  rowDiv.removeChild(lastChild);
	  recycleButton(lastChild);
	}
	
	//update existing nodes
	for (let i = 2; i < rowNodes.length; ++i) {
	  let node = rowNodes[i];
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
	    
	    select.innerHTML = `<option disabled selected style="display:none;"></option><option>${text}</option>`;
	    node.innerHTML = text;
	    node.appendChild(select);
	    
      node.removeEventListener('click', buttonClicked);
    } else {
      node.addEventListener('click', buttonClicked, true);
      
      //if there shouldn't be a select and there is, remove it
      if (node.childNodes.length !== 0) {
        let lastChild = node.childNodes[node.childNodes.length - 1];
        if (lastChild.tagName === "SELECT") {
          node.removeChild(lastChild);
          recycleSelect(lastChild);
        }
        
        node.innerHTML = text;
      }
	  }
	  
    
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
	}
	
	//add new items
	let toAdd = -toRemove;
	for (let i = 0; i < toAdd; ++i) {
    let node = getButton();
    node.col = rowNodes.length - 2;
    
	  const [text, style, dropdown] = getItem(row, node.col);
    node.innerHTML = text;
    
    if (dropdown) {
      let select = getSelect();
      select.innerHTML = `<option disabled selected style="display:none;"></option><option>${text}</option>`;
      node.append(select);
    } else {
      node.addEventListener('click', buttonClicked, true);
    }
    
    rowDiv.append(node);
	  
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
	}
	
	rowDiv.row = row;
	
	const indentation = getIndentation(row);
	rowNodes[1].style.width = Math.max(0, 8 * indentation) + "px";
	rowNodes[1].style.borderRightWidth =  indentation ? "4px" : "0px";
}


function getButton() {
  if (buttonPool.length !== 0) {
    return buttonPool.pop();
  } else {
    let newButton = document.createElement("button");
    newButton.classList.add("item");
    return newButton;
  }
}

function getSelect() {
  if (selectPool.length !== 0) {
    return selectPool.pop();
  } else {
    let newSelect = document.createElement("select");
    newSelect.classList.add("hidden-select");
    newSelect.addEventListener('click', selectClicked, true);
    newSelect.addEventListener('change', selectChanged, true);
    return newSelect;
  }
}

function recycleButton(button) {
  button.removeEventListener('click', buttonClicked);

  if (button.childNodes.length !== 0) {
    let lastChild = button.childNodes[button.childNodes.length - 1];
    if (lastChild.tagName === "SELECT")
      recycleSelect(lastChild);
  }
  
  button.innerHTML = "";
  buttonPool.push(button);
}

function recycleSelect(select) {
  select.removeEventListener('click', selectClicked);
  select.removeEventListener('click', selectChanged);
  
  select.innerHTML = "";
  selectPool.push(select);
}



function buttonClicked(event) {
  let button = event.currentTarget;
  
  let row = button.parentElement.row|0;
  let col = button.col|0;
  
  console.log(`button clicked ${row},${col}`);
  
  let response = clickItem(row, col);
  if (response.instant) {
    const [text, style] = response.instant;
    button.innerHTML = text;
    
    if (button.classList.length == 2)
      button.classList.remove(button.classList[1]);
    if (style !== null)
      button.classList.add(style);
  }
}

function selectClicked(event) {
  let select = event.currentTarget
  let button = select.parentElement;
  
  let row = button.parentElement.row|0;
  let col = button.col|0;
  
  if (select.used) {
    console.log("select clicked after selecting item");
    select.used = false;
  } else {
    console.log(`select clicked ${row},${col}`);
  }
}

function selectChanged(event) {
  let select = event.currentTarget;
  console.log("selectChanged " + select.value);
  
  select.value = "";
  select.used = true;
}

function appendChanged(event) {
  let select = event.currentTarget;
  
  let row = select.parentElement.row|0;
  //console.log(`append changed ${row},${select.value},${select.selectedIndex}`);
  
  if (select.selectedIndex === 1) {
    insertRow(row + 1);
    insertDiv(row + 1);
    console.log(`inserting row ${row}`);
  }
  if (select.selectedIndex === 2) {
    deleteRow(row);
    deleteDiv(row);
  }
  
  select.value = "";
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
    document.body.style.height = (getRowCount() + visibleRowCount - 2) * rowHeight + "px";
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