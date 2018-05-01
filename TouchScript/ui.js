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
let dropdownPool = [];

const context = canvas.getContext("2d", { alpha: false });

let renderLoop = 0;
let error = null;
let state = {}; //holds the js version of the script

let touchMoved = false;

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
	let outerDiv = document.createElement("div");
	outerDiv.classList.add("outer-row");
	
	let innerRow = document.createElement("div");
	innerRow.classList.add("inner-row");
  
  let table = document.createElement("table");
	
	let indentation = document.createElement("td");
	indentation.classList.add("indentation");
	table.append(indentation);
	
  let select = document.createElement("select");
  select.classList.add("hidden-select");
  select.addEventListener('change', appendChanged, true);
  select.innerHTML =
`<option disabled selected style="display:none;"></option>
<option>New line</option>
<option>Delete line</option>`;

  let dropdown = document.createElement("td");
  dropdown.classList.add("append");
  dropdown.append(select);
	
	table.append(dropdown);
	innerRow.append(table);
  outerDiv.append(innerRow);
  
  return outerDiv;
}

/* prepare the div for garbage collection by recycling all it's items */
function prepareForGarbageCollection(div) {
  let table = div.firstChild.firstChild;
  let tableCells = table.childNodes;
	
	for (let i = tableCells.length - 2; i > 0; --i) {
	  let node = tableCells[i];
	  table.removeChild(node);
	  
	  if (node.isDropdown) {
      cleanDropdown(node);
      dropdownPool.push(node);
    } else {
      node.innerHTML = "";
	    buttonPool.push(node);
    }
	}
	
	tableCells[1].removeEventListener('change', appendChanged);
	
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



function updateList(modifiedRow) {
  //tell the rows which position they are
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    //update the row property of the outer row's middle row's inner row
    list.childNodes[i].firstChild.firstChild.row = i + firstLoadedRowPosition;
  }
  
	loadedRowCount = Math.min(visibleRowCount + 6, script.getRowCount());
  
  spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
  document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  
  updateDebug();
}




function loadRow(row, rowDiv) {
	row = row|0;
	
	let itemCount = script.getItemCount(row);
  let table = rowDiv.firstChild.firstChild;
	table.row = row;
  let tableCells = table.childNodes;
  
	let appendButton = tableCells[tableCells.length - 1];
	table.removeChild(appendButton);
	
	//remove the items of the table beyond the ones it will need
	//the first node is the indentation
	for (let i = tableCells.length - 1; i > 0; --i) {
	  let lastChild = tableCells[i];
	  table.removeChild(lastChild);
	  
	  if (lastChild.isDropdown) {
      cleanDropdown(lastChild);
      dropdownPool.push(lastChild);
    } else {
      lastChild.innerHTML = "";
	    buttonPool.push(lastChild);
    }
	}
	
	//add new items
	for (let col = 0; col < itemCount; ++col) {
	  const [line1, line2, style, dropDown] = script.getItem(row, col);
    
    let node = dropDown ? getDropdown() : getButton();
    node.col = col;
    
    node.append(line1);
    if (line2) {
      node.append(document.createElement("br"));
      node.append(line2);
    }
	  
    if (node.classList.length == 2)
      node.classList.remove(node.classList[1]);
    if (style !== null)
      node.classList.add(style);
    
    table.append(node);
	}
	
	table.append(appendButton);
	
	const indentation = script.getIndentation(row);
	tableCells[0].style.minWidth = 8 * indentation + "px";
	tableCells[0].style.borderRightWidth =  indentation ? "4px" : "0px";
}


function getButton() {
  if (buttonPool.length !== 0) {
    return buttonPool.pop();
  } else {
    let node = document.createElement("td");
    node.isDropdown = false;
    node.classList.add("item");
    node.addEventListener('click', buttonClicked, true);
    node.addEventListener('touchstart', onTouchStart, true);
    node.addEventListener('touchmove', onTouchMove, true);
    node.addEventListener('touchend', onTouchEnd, false);
    /* node.addEventListener('click', () => {console.log('click')}, true);
    node.addEventListener('touchstart', () => {console.log('touchstart')}, true);
    node.addEventListener('touchend', () => {console.log('touchend')}, true);
    node.addEventListener('touchmove', () => {console.log('touchmove')}, true); */
    return node;
  }
}

function getDropdown() {
  if (dropdownPool.length !== 0) {
    return dropdownPool.pop();
  } else {
    let node = document.createElement("td");
    node.classList.add("dropdown");
    node.isDropdown = true;
    
    let newSelect = document.createElement("select");
    newSelect.classList.add("hidden-select");
    newSelect.addEventListener('click', selectClicked, true);
    newSelect.addEventListener('change', selectChanged, true);
    /* newSelect.addEventListener('click', () => {console.log('click')}, true);
    newSelect.addEventListener('touchstart', () => {console.log('touchstart')}, true);
    newSelect.addEventListener('touchend', (event) => {console.log('touchend'); event.preventDefault()}, true);
    newSelect.addEventListener('touchmove', () => {console.log('touchmove')}, true); */
    newSelect.innerHTML = `<option disabled selected style="display:none;"><option>1</option><option>2</option><option>3</option>`;
    
    node.append(newSelect);
    return node;
  }
}

/* remove all unnecessary children from the div so loadItem() can immediately populate it*/
function cleanDropdown(div) {
  
  //remove all the text and <br> nodes located after the <select>
  for (let i = div.childNodes.length - 1; i > 0; --i) {
    div.removeChild(div.childNodes[i]);
  }
  
  //let select = div.firstChild;
  //remove all options except the dud at position 0
}



function buttonClicked(event) {
  let button = event.currentTarget;
  
  let row = button.parentElement.row|0;
  let col = button.col|0;
  
  console.log(`button clicked ${row},${col}`);
  
  let response = script.clickItem(row, col);
  if (response.instant) {
	  const [line1, line2, style, dropDown] = response.instant;
    
    button.innerHTML = "";
    button.append(line1);
    if (line2) {
      button.append(document.createElement("br"));
      button.append(line2);
    }
	  
    if (button.classList.length == 2)
      button.classList.remove(button.classList[1]);
    if (style !== null)
      button.classList.add(style);
  }
}

function onTouchStart(event) {
  console.log("touch start");
  touchMoved = false;
}

function onTouchMove(event) {
  console.log("touch move");
  touchMoved = true;
}

function onTouchEnd(event) {
  console.log("touch end");
  if (!touchMoved) {
    buttonClicked(event);
    event.preventDefault();
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
    script.insertRow(row + 1);
    insertRow(row + 1);
    console.log(`inserting row ${row}`);
  }
  if (select.selectedIndex === 2) {
    script.deleteRow(row);
    deleteRow(row);
  }
  
  select.value = "";
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