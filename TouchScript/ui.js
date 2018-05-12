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
const modal = document.getElementById("modal");
const context = canvas.getContext("2d", { alpha: false });

let buttonPool = [];

let renderLoop = 0;
let error = null;
let eventHandlers = new Object(null);

const script = new Script();



modal.style.display = "none";
modal.onclick = modalContainerClicked;

canvas.addEventListener("contextmenu", preventDefault);

canvas.addEventListener("touchstart", function(event) {
  if (eventHandlers.ontouchstart) {
    for (const touch of event.changedTouches)
      eventHandlers.ontouchstart(touch.pageX * window.devicePixelRatio, touch.pageY * window.devicePixelRatio, touch.identifier);
  }

  event.preventDefault();
});

canvas.addEventListener("touchmove", function(event) {
  if (eventHandlers.ontouchmove) {
    for (const touch of event.changedTouches)
      eventHandlers.ontouchmove(touch.pageX * window.devicePixelRatio, touch.pageY * window.devicePixelRatio, touch.identifier);
  }
});

canvas.addEventListener("touchend", function(event) {
  if (eventHandlers.ontouchend) {
    for (const touch of event.changedTouches)
      eventHandlers.ontouchend(touch.pageX * window.devicePixelRatio, touch.pageY * window.devicePixelRatio, touch.identifier);
  }
});

canvas.addEventListener("mousedown", function(event) {
  if (eventHandlers.onmousedown) {
    eventHandlers.onmousedown(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.button);
  }
});

canvas.addEventListener("mousemove", function(event) {
  if (eventHandlers.onmousemove) {
    eventHandlers.onmousemove(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.movementX * window.devicePixelRatio, event.movementY * window.devicePixelRatio);
  }
});

canvas.addEventListener("mouseup", function(event) {
  if (eventHandlers.onmouseup) {
    eventHandlers.onmouseup(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.button);
  }

  event.preventDefault;
});



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

    let innerRow = lastChild.childNodes[1];
  
    while (innerRow.childNodes.length > 2) {
      buttonPool.push(innerRow.lastChild);
      innerRow.removeChild(innerRow.lastChild);
    }
  }

  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  
  if (eventHandlers.onresize)
    eventHandlers.onresize(canvas.width, canvas.height);
};
document.body.onresize();



//detect when items need to be loaded in the direction of scroll, take nodes from the back to add to the front
window.onscroll = function() {
  let firstVisiblePosition = Math.floor(window.scrollY / rowHeight);
  
  //keep a number of rows prepared for both direction
  while ((firstVisiblePosition - bufferCount + forwardBufferCount > firstLoadedPosition) && (firstLoadedPosition + loadedCount < getRowCount())) {
    loadRow(firstLoadedPosition + loadedCount, list.firstChild);
    list.appendChild(list.firstChild);
    ++firstLoadedPosition;
  }
  
  while ((firstVisiblePosition - forwardBufferCount < firstLoadedPosition) && (firstLoadedPosition > 0)) {
    loadRow(firstLoadedPosition - 1, list.lastChild);
    list.insertBefore(list.lastChild, list.firstChild);
    --firstLoadedPosition;
  }
  
  spacer.style.height = firstLoadedPosition * rowHeight + "px";

  debug.firstChild.nodeValue = `[${firstLoadedPosition}, ${(firstLoadedPosition + loadedCount - 1)}]`;
  
  //scrolling overrides slide-out menu
  for (let row of list.childNodes) {
    if (row.touchCaptured) {
        row.touchId = -1;
        row.firstChild.classList.add("slow-transition");
        row.firstChild.style.width = "";
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
    
    try {
      script.getJavaScript() ();
    } catch (e) {
      //error = e;
      console.log(e);
      window.location.hash = "";
    }
    
    
    if (! (eventHandlers.ondraw)) {
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
  append.onclick = appendClicked;
  
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




function insertRow(position) {
  script.insertRow(position);

  let node = list.lastChild;
  loadRow(position, node);
  
  let rowIndex = position - firstLoadedPosition;
  list.insertBefore(node, list.childNodes[rowIndex]);

  updateLineNumbers(rowIndex + 1);
  document.body.style.height = getRowCount() * rowHeight + "px";
}



function deleteRow(position) {
  script.deleteRow(position);

  let rowIndex = position - firstLoadedPosition;
  let node = list.childNodes[rowIndex];
  
  let newPosition = firstLoadedPosition + loadedCount - 1;
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
  
  let innerRow = rowDiv.childNodes[1];
  innerRow.position = position;
  
  //update the line number item of the slide menu
  innerRow.previousSibling.firstChild.firstChild.nodeValue = String(position).padStart(4);
  
  while (innerRow.childNodes.length > 2) {
    buttonPool.push(innerRow.lastChild);
    innerRow.removeChild(innerRow.lastChild);
  }

  if (position >= script.getRowCount()) {
    innerRow.firstChild.style.display = "none";
    return;
  }
  
  let itemCount = script.getItemCount(position);
  for (let col = 1; col < itemCount; ++col) {
    const [text, style] = script.getItem(position, col);
    
    let node = getItem(text);
    node.className = "item " + style;
    node.position = col;
    innerRow.appendChild(node);
  }
  
  const indentation = script.getIndentation(position);
  innerRow.firstChild.style.width = 6 * indentation + "px";
  innerRow.firstChild.style.display = (indentation === 0) ? "none" : "";
}



function getItem(text) {
  if (buttonPool.length !== 0) {
    let node = buttonPool.pop();
    node.firstChild.nodeValue = text;
    return node;
  } else {
    let node = document.createElement("button");
    node.appendChild(document.createTextNode(text));
    node.onclick = itemClickHandler;
    return node;
  }
}



function configureModal(options, row, col) {
  for (const option of options) {
    let button = getItem(option.text);
    button.className = "item modal-item " + option.style;
    button.position = option.payload;
    modal.appendChild(button);
  }

  modal.row = row;
  modal.col = col;
  modal.style.display = "";
}



function preventDefault(e) {
  e.preventDefault();
}

function modalContainerClicked(event) {
  modal.style.display = "none";
  event.stopPropagation();
  event.preventDefault();

  while (modal.hasChildNodes()) {
    buttonPool.push(modal.lastChild);
    modal.removeChild(modal.lastChild);
  }
}

function slideMenuClickHandler(event) {
  let slideMenu = event.currentTarget;
  let position = slideMenu.nextSibling.position;

  if (position < script.getRowCount()) {
    switch (event.button) {
      case 0:
        insertRow(position + 1);
        break;
      
      case 2:
        deleteRow(position);
        break;
    }
  }
}

function appendClicked(event) {
  let row = event.currentTarget.parentElement.position|0;
  
  let options = script.appendClicked(row);
  configureModal(options, row, -1);
}

function menuItemClicked(payload) {
  while (modal.hasChildNodes()) {
    buttonPool.push(modal.lastChild);
    modal.removeChild(modal.lastChild);
  }

  let response = script.menuItemClicked(modal.row, modal.col, payload);

  if (typeof response === 'number') {
    if (response >= 2) {
      let rowIndex = modal.row - firstLoadedPosition;
      loadRow(modal.row, list.childNodes[rowIndex]);

      if (response === 3) {
        insertRow(modal.row + 1);
        insertRow(modal.row + 2);
      }

      //configuring a row out of bounds inserts additional rows
      document.body.style.height = getRowCount() * rowHeight + "px";
    } else if (response === 1) {
      //menuItemClicked(response[0].payload);
      //TODO update the contents of just the modified item
      let rowIndex = modal.row - firstLoadedPosition;
      loadRow(modal.row, list.childNodes[rowIndex]);
    }
  }
  else if (Array.isArray(response) && response.length > 0) {
    configureModal(response, modal.row, modal.col);
    return;
  }

  modal.style.display = "none";
}

function itemClickHandler(event) {
  event.stopPropagation();
  let button = event.target;

  let row = button.parentElement.position|0;
  let col = button.position|0;

  if (button.parentElement === modal) {
    menuItemClicked(button.position);
    return;
  }
  
  let options = script.itemClicked(row, col);
  if (Array.isArray(options)) {
    if (options.length > 0)
      configureModal(options, row, col);
  }
  else {
    button.firstChild.nodeValue = options.text;
    button.className = "item " + options.style;
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
        row.firstChild.style.width = "";
        
        const position = row.childNodes[1].position;
        if (position < script.getRowCount()) {
          let travel = touch.pageX - row.touchStartX;
          
          if (travel > 200) {
            deleteRow(position);
          }
          else if (travel > 80) {
            insertRow(position + 1);
          }
        }
      }
      
      row.touchCaptured = false;
      break;
    }
  }
}



function drawCircle(x, y, r, color) {
  r = Math.abs(r);

  context.beginPath();
  context.fillStyle = color;
  context.arc(x,y,r, 0,2*Math.PI);
  context.fill();
}


function drawRectangle(x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}




function draw(timestamp) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  eventHandlers.ondraw(timestamp);
  
  renderLoop = window.requestAnimationFrame(draw);
}