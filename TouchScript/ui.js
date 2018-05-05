"use strict";

let loadedRowCount = 0;
let visibleRowCount = 0;
const rowHeight = 40;
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
let eventHandlers = new Object(null);

const script = new Script();



document.body.onresize = function () {
  visibleRowCount = Math.ceil(window.innerHeight / rowHeight);
  let newLoadedRowCount = visibleRowCount + 6;
  newLoadedRowCount = Math.min(newLoadedRowCount, script.getRowCount());
  let diff = newLoadedRowCount - loadedRowCount;
  loadedRowCount = newLoadedRowCount;
  
  //allow the viewport to scroll past the end of the list
  if (window.location.hash === "")
    document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  else
    document.body.style.height = "auto";
  
  if (diff > 0) {
    for(let i = 0; i < diff; ++i) {
      let div = createRow();
      let position = list.childNodes.length + firstLoadedRowPosition;
      
      //if the user is scrolled all the way to the bottom, prepend instead of appending
      if (position < script.getRowCount()) {
        loadRow(position, div);
        list.appendChild(div);
      } else {
        let position = firstLoadedRowPosition - 1;
        loadRow(position, div);
        list.insertBefore(div, list.firstChild);
        --firstLoadedRowPosition;
        spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
      }
    }
  } else if (diff < 0) {
    diff = -diff;
    for (let i = 0; i < diff; ++i) {
      let lastChild = list.lastChild;
      list.removeChild(lastChild);
      prepareForGarbageCollection(lastChild);
    }
  }
  
  firstVisibleRowPosition = Math.floor(window.scrollY / rowHeight);
  updateDebug();

  //resize canvas as well
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  //console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
  
  if ("resize" in eventHandlers)
    eventHandlers.resize(canvas.width, canvas.height);
};
document.body.onresize();



function getWidth() {
  return window.innerWidth;
}

function getHeight() {
  return window.innerHeight;
}



//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
  firstVisibleRowPosition = Math.floor(window.scrollY / rowHeight);
  
  //keep a buffer of 2 unseen elements in either direction
  while ((firstVisibleRowPosition - 4 > firstLoadedRowPosition) && (firstLoadedRowPosition < script.getRowCount() - loadedRowCount)) {
    let position = loadedRowCount + firstLoadedRowPosition;
    
    let firstChild = list.firstChild;
    list.removeChild(firstChild);
    
    loadRow(position, firstChild);
    list.appendChild(firstChild);
    
    ++firstLoadedRowPosition;
  }
  
  while ((firstVisibleRowPosition - 2 < firstLoadedRowPosition) && (firstLoadedRowPosition > 0)) {
    let position = firstLoadedRowPosition - 1;
    
    let lastChild = list.lastChild;
    list.removeChild(lastChild);
    
    loadRow(position, lastChild);
    list.insertBefore(lastChild, list.firstChild);
    
    --firstLoadedRowPosition;
  }
  
  spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
  updateDebug();
};


function createRow() {
  let lineNumberItem = document.createElement("p");
  lineNumberItem.classList.add("slide-menu-item");
  lineNumberItem.id = "line-number-item";
  
  let newlineItem = document.createElement("p");
  newlineItem.classList.add("slide-menu-item");
  newlineItem.id = "newline-item";
  
  let deleteLineItem = document.createElement("p");
  deleteLineItem.classList.add("slide-menu-item");
  deleteLineItem.id = "delete-line-item";
  
  let slideMenu = document.createElement("div");
  slideMenu.classList.add("slide-menu");
  slideMenu.classList.add("slow-transition");
  slideMenu.appendChild(lineNumberItem);
  slideMenu.appendChild(newlineItem);
  slideMenu.appendChild(deleteLineItem);
  
  let indentation = document.createElement("button");
  indentation.classList.add("indentation");

  let append = document.createElement("button");
  append.classList.add("append");
  
  let innerDiv = document.createElement("div");
  innerDiv.classList.add("inner-row");
  innerDiv.appendChild(indentation);
  innerDiv.appendChild(append);
  
  let outerDiv = document.createElement("div");
  outerDiv.classList.add("outer-row");
  outerDiv.appendChild(slideMenu);
  outerDiv.appendChild(innerDiv);
  
  outerDiv.touchId = -1;
  outerDiv.addEventListener("touchstart", touchStartHandler);
  outerDiv.addEventListener("touchmove", touchMoveHandler);
  outerDiv.addEventListener("touchend", touchEndHandler);
  outerDiv.addEventListener("touchcancel", touchEndHandler);
  
  return outerDiv;
}

/* prepare the div for garbage collection by recycling all it's items */
function prepareForGarbageCollection(div) {
  let innerRow = div.childNodes[1];
  
  while (innerRow.childNodes.length > 2) {
    let lastChild = innerRow.lastChild;
    innerRow.removeChild(lastChild);
    buttonPool.push(lastChild);
  }
  
  innerRow.onclick = null;
  div.ontouchstart = null;
  div.ontouchmove = null;
  div.ontouchend = null;
  console.log(`recycling row`);
}




function insertRow(position) {
  //grab an offscreen div to modify, or create a new one if the entire script is on screen
  let rowToModify;
  
  let lastLoaded = firstLoadedRowPosition + loadedRowCount - 1;
  let lastVisible = firstVisibleRowPosition + visibleRowCount - 1;
  
  if (visibleRowCount + 6 > loadedRowCount) {
    rowToModify = createRow();
  }
  else if (lastLoaded > lastVisible) {
    rowToModify = list.childNodes[list.childNodes.length - 1];
    list.removeChild(rowToModify);
  }
  else if (firstLoadedRowPosition < firstVisibleRowPosition) {
    rowToModify = list.firstChild;
    list.removeChild(rowToModify);
  }
  
  loadRow(position, rowToModify);
  
  
  let positionToInsert = position - firstLoadedRowPosition;
  list.insertBefore(rowToModify, list.childNodes[positionToInsert]);
  
  updateList(positionToInsert + 1);
}

/* move the given row off screen and update its content, or garbage collect it if the entire script is on screen */
function deleteRow(position) {
  let lastLoaded = firstLoadedRowPosition + loadedRowCount - 1;
  let lastVisible = firstVisibleRowPosition + visibleRowCount - 1;
  
  let childToRemove = list.childNodes[position - firstLoadedRowPosition];
  list.removeChild(childToRemove);
  
  //move the removed div either above or below the visible list of items unless the entire script is already loaded
  if (lastLoaded + 1 < script.getRowCount()) {
    loadRow(lastLoaded + 1, childToRemove);
    list.appendChild(childToRemove);
    console.log(`appending deleted div row ${position} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  }
  else if (firstLoadedRowPosition > 0) {
    loadRow(firstLoadedRowPosition - 1, childToRemove);
    list.insertBefore(childToRemove, list.firstChild);
    --firstLoadedRowPosition;
    spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
    console.log(`prepending deleted div row ${position} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  } else {
    //if the removed item can't be placed at either end of the list, get rid of it
    prepareForGarbageCollection(childToRemove);
  }
  
  updateList(position - firstLoadedRowPosition);
}



//tell the rows which position they are
function updateList(modifiedRow) {
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    let row = list.childNodes[i];
    let position = i + firstLoadedRowPosition;
    
    //update the line number item of the slide menu
    row.firstChild.firstChild.textContent = position;
    
    //update the row property of the inner row
    row.childNodes[1].position = position;
  }
  
  loadedRowCount = Math.min(visibleRowCount + 6, script.getRowCount());
  
  spacer.style.height = firstLoadedRowPosition * rowHeight + "px";
  document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  
  updateDebug();
}



function updateDebug() {
  let debugText = ""//"scrollY: " + Math.floor(window.scrollY) + "\n"
      + "loaded: [" + firstLoadedRowPosition + ", " + (firstLoadedRowPosition + loadedRowCount - 1) + "]\n"
      + "visible: [" + firstVisibleRowPosition + ", " + (firstVisibleRowPosition + visibleRowCount - 1) + "]";
  debug.textContent = debugText;
}



function loadRow(position, rowDiv) {
  position = position|0;
  
  let itemCount = script.getItemCount(position);
  let innerRow = rowDiv.childNodes[1];
  innerRow.position = position;
  
  //update the line number item of the slide menu
  innerRow.parentElement.firstChild.firstChild.textContent = position;
  
  while (innerRow.childNodes.length > 2) {
    let lastChild = innerRow.lastChild;
    innerRow.removeChild(lastChild);
    buttonPool.push(lastChild);
  }
  
  for (let col = 0; col < itemCount; ++col) {
    const [text, style] = script.getItem(position, col);
    
    let node;
    if (buttonPool.length !== 0) {
      node = buttonPool.pop();
      node.firstChild.nodeValue = text;
    } else {
      node = document.createElement("button");
      node.appendChild(document.createTextNode(text));
      node.onclick = buttonClickHandler;
    }
    
    node.className = "item" + style;
    node.col = col;
    innerRow.appendChild(node);
  }
  
  const indentation = script.getIndentation(position);
  innerRow.firstChild.style.width = 8 * indentation + "px";
  innerRow.firstChild.style.display =  (indentation === 0) ? "none" : "";
}


function buttonClickHandler(event) {
  let button = event.target;
  
  let position = button.parentElement.position|0;
  let col = button.col|0;
  
  console.log(`button clicked ${position},${col}`);
  
  let response = script.clickItem(position, col);
  if (response.instant) {
    const [text, style] = response.instant;
    button.firstChild.nodeValue = text;
    button.className = "item" + style;
  }
}


function touchStartHandler(event) {
  let row = event.currentTarget;
  
  if (row.touchId === -1) {
    row.sliding = false;
    
    let touch = event.changedTouches[0];
    row.touchId = touch.identifier;
    row.touchStartX = touch.pageX;
    row.touchStartY = touch.pageY;
    row.touchCapture = false;
    
    row.firstChild.classList.remove("slow-transition");
    row.firstChild.style.width = null;
    
    row.slideMenuStartWidth = row.firstChild.offsetWidth;
    
  }
}

function touchMoveHandler(event) {
  let row = event.currentTarget;
  
  let touches = event.changedTouches;
  for (let touch of touches) {
    if (touch.identifier === row.touchId) {
      let offsetX = touch.pageX - row.touchStartX;
      let offsetY = touch.pageY - row.touchStartY;
      
      if (!row.touchCapture && Math.abs(offsetY) < 10 && Math.abs(offsetX) > 10) {
        row.touchCapture = true;
      }
      
      if (row.touchCapture) {
        row.firstChild.style.width = row.slideMenuStartWidth + Math.max(0, offsetX) + "px";
        event.preventDefault();
      }
      break;
    }
  }
}

function touchEndHandler(event) {
  let row = event.currentTarget;
  
  let touches = event.changedTouches;
  for (let touch of touches) {
    if (touch.identifier === row.touchId) {
      row.touchId = -1;
      
      if (row.touchCapture) {
        row.firstChild.classList.add("slow-transition");
        
        let offsetX = touch.pageX - row.touchStartX;
        
        if (offsetX > 160) {
          script.deleteRow(row.childNodes[1].position);
          deleteRow(row.childNodes[1].position);
          row.firstChild.style.width = "100%";
        }
        
        else if (offsetX > 80) {
          script.insertRow(row.childNodes[1].position + 1);
          insertRow(row.childNodes[1].position + 1);
          row.firstChild.style.width = null;
        } else {
          row.firstChild.style.width = null;
        }
      }
      
      row.touchCapture = false;
      break;
    }
  }
}




document.body.onhashchange = function () {
  if (window.location.hash === "") {
    editor.style.display = "";
    canvas.style.display = "none";

    if (renderLoop !== 0) {
      window.cancelAnimationFrame(renderLoop)
      renderLoop = 0;
    }

    if (error !== null) {
      alert(error);
      error = null;
    }
    
    eventHandlers = new Object(null);
    document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  }
  
  else {
    editor.style.display = "none";
    canvas.style.display = "";
    
    script.getJavaScript() ();
    
    if (! ("ondraw" in eventHandlers)) {
      console.log("draw handler is not defined");
      window.location.hash = "";
      return;
    }
    
    if (renderLoop === 0)
      renderLoop = window.requestAnimationFrame(draw);
    
    document.body.style.height = "auto";
  }
};
document.body.onhashchange();




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
  
  eventHandlers.ondraw(timestamp);
  
  renderLoop = window.requestAnimationFrame(draw);
}