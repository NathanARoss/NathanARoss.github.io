"use strict";

const rowHeight = 40;
const bufferCount = 10;
const forwardBufferCount = 4;
let loadedCount = 0;
let firstLoadedPosition = 0;

const list = document.getElementById("list");
const spacer = document.getElementById("spacer");
const debug = document.getElementById("debug");
const canvas = document.getElementById("canvas");
const editor = document.getElementById("editor_div");
const context = canvas.getContext("2d", { alpha: false });

let buttonPool = [];

let renderLoop = 0;
let error = null;
let eventHandlers = new Object(null);

const script = new Script();



document.body.onresize = function () {
  let newLoadedCount = Math.ceil(window.innerHeight / rowHeight) + bufferCount;
  let diff = newLoadedCount - loadedCount;
  loadedCount = newLoadedCount;
  
  //allow the viewport to scroll past the currently loaded rows
  if (window.location.hash === "")
    document.body.style.height = getRowCount() * rowHeight + "px";
  
  for(let i = 0; i < diff; ++i) {
    let div = createRow();
    let position = list.childNodes.length + firstLoadedPosition;
    loadRow(position, div);
    list.appendChild(div);
  }

  for (let i = diff; i < 0; ++i) {
    let lastChild = list.lastChild;
    list.removeChild(lastChild);
    prepareForGarbageCollection(lastChild);
  }

  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  
  if (eventHandlers.resize)
    eventHandlers.resize(canvas.width, canvas.height);
};
document.body.onresize();



//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
  let firstVisiblePosition = Math.floor(window.scrollY / rowHeight);
  
  //keep a buffer of 2 unseen elements in either direction
  while ((firstVisiblePosition - bufferCount + forwardBufferCount > firstLoadedPosition) && (firstLoadedPosition + loadedCount < getRowCount())) {
    let firstChild = list.firstChild;
    list.removeChild(firstChild);
    
    loadRow(firstLoadedPosition + loadedCount, firstChild);
    list.appendChild(firstChild);
    
    ++firstLoadedPosition;
  }
  
  while ((firstVisiblePosition - forwardBufferCount < firstLoadedPosition) && (firstLoadedPosition > 0)) {
    let lastChild = list.lastChild;
    list.removeChild(lastChild);
    
    loadRow(firstLoadedPosition - 1, lastChild);
    list.insertBefore(lastChild, list.firstChild);
    
    --firstLoadedPosition;
  }
  
  spacer.style.height = firstLoadedPosition * rowHeight + "px";

  debug.firstChild.nodeValue = `[${firstLoadedPosition}, ${(firstLoadedPosition + loadedCount - 1)}]`;
  
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
window.onscroll();



document.body.onhashchange = function() {
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
    document.body.style.height = getRowCount() * rowHeight + "px";
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



function getRowCount() {
  return script.getRowCount() + loadedCount - bufferCount - 2;
}



function createRow() {
  let lineNumberItem = document.createElement("p");
  lineNumberItem.classList.add("slide-menu-item");
  lineNumberItem.classList.add("no-select");
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
  slideMenu.addEventListener("mousedown", slideMenuClickHandler);
  slideMenu.addEventListener("contextmenu", preventDefault);
  slideMenu.addEventListener("touchstart", preventDefault);
  
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
  
  console.log(`recycling row`);
}




function insertRow(position) {
  let pos = Math.min(script.getRowCount()|0, position|0);

  do {
    script.insertRow(pos);

    let node = list.lastChild;
    list.removeChild(node);
    
    loadRow(pos, node);
    
    let rowIndex = pos - firstLoadedPosition;
    list.insertBefore(node, list.childNodes[rowIndex]);
    
    updateLineNumbers(rowIndex + 1);
    document.body.style.height = getRowCount() * rowHeight + "px";

    ++pos;
  } while (position > script.getRowCount());
}



function deleteRow(position) {
  script.deleteRow(position);

  let rowIndex = position - firstLoadedPosition;
  let node = list.childNodes[rowIndex];
  list.removeChild(node);
  
  let newPosition = firstLoadedPosition + loadedCount;
  loadRow(newPosition, node);
  list.appendChild(node);
  
  updateLineNumbers(rowIndex);
  document.body.style.height = getRowCount() * rowHeight + "px";
}



function updateLineNumbers(modifiedRow) {
  let count = list.childNodes.length;
  for (let i = modifiedRow; i < count; ++i) {
    let row = list.childNodes[i];
    let position = i + firstLoadedPosition;
    
    row.firstChild.firstChild.firstChild.nodeValue = String(position).padStart(4);
    row.childNodes[1].position = position;
  }
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



function preventDefault(e) {
  e.preventDefault();
}

function slideMenuClickHandler(event) {
  let slideMenu = event.currentTarget;
  let position = slideMenu.nextSibling.position;
  
  switch (event.button) {
    case 0:
      insertRow(position + 1);
      break;
    
    case 2:
      deleteRow(position);
      break;
  }
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
          deleteRow(row.childNodes[1].position);
        }
        else if (travel > 80) {
          insertRow(row.childNodes[1].position + 1);
        }
      }
      
      row.touchCaptured = false;
      break;
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