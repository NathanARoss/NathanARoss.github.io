"use strict";

const rowHeight = 40;
let loadedRowCount = 0;
let visibleRowCount = 0;
let firstLoadedPosition = 0;
let firstVisiblePosition = 0;

const list = document.getElementById("list"); //a div containing all elements
const spacer = document.getElementById("spacer"); //an empty div that changes height to offset elements
const debug = document.getElementById("debug");

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
      let position = list.childNodes.length + firstLoadedPosition;
      
      //if the user is scrolled all the way to the bottom, prepend instead of appending
      if (position < script.getRowCount()) {
        loadRow(position, div);
        list.appendChild(div);
      } else {
        let position = firstLoadedPosition - 1;
        loadRow(position, div);
        list.insertBefore(div, list.firstChild);
        --firstLoadedPosition;
        spacer.style.height = firstLoadedPosition * rowHeight + "px";
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
  
  firstVisiblePosition = Math.floor(window.scrollY / rowHeight);
  updateDebug();

  //resize canvas as well
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  //console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
  
  if (eventHandlers.resize)
    eventHandlers.resize(canvas.width, canvas.height);
};
document.body.onresize();



function getWidth() {
  return canvas.width;
}

function getHeight() {
  return canvas.height;
}



//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
  firstVisiblePosition = Math.floor(window.scrollY / rowHeight);
  
  //keep a buffer of 2 unseen elements in either direction
  while ((firstVisiblePosition - 4 > firstLoadedPosition) && (firstLoadedPosition < script.getRowCount() - loadedRowCount)) {
    let position = loadedRowCount + firstLoadedPosition;
    
    let firstChild = list.firstChild;
    list.removeChild(firstChild);
    
    loadRow(position, firstChild);
    list.appendChild(firstChild);
    
    ++firstLoadedPosition;
  }
  
  while ((firstVisiblePosition - 2 < firstLoadedPosition) && (firstLoadedPosition > 0)) {
    let position = firstLoadedPosition - 1;
    
    let lastChild = list.lastChild;
    list.removeChild(lastChild);
    
    loadRow(position, lastChild);
    list.insertBefore(lastChild, list.firstChild);
    
    --firstLoadedPosition;
  }
  
  spacer.style.height = firstLoadedPosition * rowHeight + "px";
  updateDebug();
  
  //scrolling overrides slide-out menu
  for (let row of list.childNodes) {
    if (row.touchCaptured) {
        row.touchId = -1;
        row.firstChild.classList.add("slow-transition");
        row.firstChild.style.width = null;
        
    }
    
    row.touchCapturable = false;
  }
};





function createRow() {
  let lineNumberItem = document.createElement("p");
  lineNumberItem.classList.add("slide-menu-item");
  lineNumberItem.id = "line-number-item";
  lineNumberItem.appendChild(document.createTextNode(""));
  
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
  
  div.removeEventListener("touchstart", touchStartHandler);
  div.removeEventListener("touchmove", touchMoveHandler);
  div.removeEventListener("touchend", touchEndHandler);
  div.removeEventListener("touchcancel", touchEndHandler);
  console.log(`recycling row`);
}




function insertRow(position) {
  let rowToModify;
  
  if (visibleRowCount + 6 > loadedRowCount) {
    rowToModify = createRow();
    console.log(`allocating new row`);
  }
  else if (firstLoadedPosition + 2 < firstVisiblePosition) {
    rowToModify = list.firstChild;
    list.removeChild(rowToModify);
    ++firstLoadedPosition;
    console.log(`reusing first row`);
  }
  else {
    rowToModify = list.lastChild;
    list.removeChild(rowToModify);
    console.log(`reusing last row`);
  }
  
  loadRow(position, rowToModify);
  
  let positionToInsert = position - firstLoadedPosition;
  list.insertBefore(rowToModify, list.childNodes[positionToInsert]);
  
  updateList(positionToInsert + 1);
}

/* move the given row off screen and update its content, or garbage collect it if the entire script is on screen */
function deleteRow(position) {
  let lastLoaded = firstLoadedPosition + loadedRowCount - 1;
  let lastVisible = firstVisiblePosition + visibleRowCount - 1;
  
  let childToRemove = list.childNodes[position - firstLoadedPosition];
  list.removeChild(childToRemove);
  
  //move the removed div either above or below the visible list of items unless the entire script is already loaded
  if (lastLoaded + 1 < script.getRowCount()) {
    loadRow(lastLoaded + 1, childToRemove);
    list.appendChild(childToRemove);
    console.log(`appending deleted div row ${position} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  }
  else if (firstLoadedPosition > 0) {
    loadRow(firstLoadedPosition - 1, childToRemove);
    list.insertBefore(childToRemove, list.firstChild);
    --firstLoadedPosition;
    spacer.style.height = firstLoadedPosition * rowHeight + "px";
    console.log(`prepending deleted div row ${position} rowCount ${script.getRowCount()} lastLoaded ${lastLoaded}`);
  } else {
    //if the removed item can't be placed at either end of the list, get rid of it
    prepareForGarbageCollection(childToRemove);
  }
  
  updateList(position - firstLoadedPosition);
}



//tell the rows which position they are
function updateList(modifiedRow) {
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    let row = list.childNodes[i];
    let position = i + firstLoadedPosition;
    
    //update the line number item of the slide menu
    //position.toLocaleString('en-US', {minimumIntegerDigits: 4, useGrouping:false});
    row.firstChild.firstChild.firstChild.nodeValue = String(position).padStart(4);
    
    //update the row property of the inner row
    row.childNodes[1].position = position;
  }
  
  loadedRowCount = Math.min(visibleRowCount + 6, script.getRowCount());
  
  spacer.style.height = firstLoadedPosition * rowHeight + "px";
  document.body.style.height = (script.getRowCount() + visibleRowCount - 2) * rowHeight + "px";
  
  updateDebug();
}



function updateDebug() {
  let debugText = ""//"scrollY: " + Math.floor(window.scrollY) + "\n"
      + "loaded: [" + firstLoadedPosition + ", " + (firstLoadedPosition + loadedRowCount - 1) + "]\n"
      + "visible: [" + firstVisiblePosition + ", " + (firstVisiblePosition + visibleRowCount - 1) + "]";
  debug.firstChild.nodeValue = debugText;
}



function loadRow(position, rowDiv) {
  position = position|0;
  
  let itemCount = script.getItemCount(position);
  let innerRow = rowDiv.childNodes[1];
  innerRow.position = position;
  
  //update the line number item of the slide menu
  innerRow.previousSibling.firstChild.firstChild.nodeValue = String(position).padStart(4);
  
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
  innerRow.firstChild.style.display = (indentation === 0) ? "none" : null;
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
    row.touchCaptured = false;
    row.touchCapturable = true;
    
    row.firstChild.classList.remove("slow-transition");
    row.firstChild.style.width = null;
    
    row.slideMenuStartWidth = row.firstChild.offsetWidth;
    
  }
}

function touchMoveHandler(event) {
  let row = event.currentTarget;
  
  if (!row.touchCapturable) {
    return;
  }
  
  let touches = event.changedTouches;
  for (let touch of touches) {
    if (touch.identifier === row.touchId) {
      let travel = touch.pageX - row.touchStartX;
      let scrollX = row.childNodes[1].scrollLeft;
      
      if (scrollX > 0) {
        row.touchStartX = touch.pageX + scrollX;
      }
      else if (!row.touchCaptured && travel > 10) {
        row.touchCaptured = true;
        row.touchStartX += 10;
        travel -= 10;
      }
      
      if (row.touchCaptured) {
        if (travel < -10) {
          row.touchCaptured = false;
          row.firstChild.style.width = null;
        } else {
          row.firstChild.style.width = row.slideMenuStartWidth + Math.max(0, travel) + "px";
          event.preventDefault();
        }
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
      
      if (row.touchCaptured) {
        row.firstChild.classList.add("slow-transition");
        row.firstChild.style.width = null;
        
        let travel = touch.pageX - row.touchStartX;
        
        if (travel > 200) {
          script.deleteRow(row.childNodes[1].position);
          deleteRow(row.childNodes[1].position);
        }
        else if (travel > 80) {
          script.insertRow(row.childNodes[1].position + 1);
          insertRow(row.childNodes[1].position + 1);
        }
      }
      
      row.touchCaptured = false;
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
    
    if (! (eventHandlers.ondraw)) {
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
  
  r = Math.abs(r);

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