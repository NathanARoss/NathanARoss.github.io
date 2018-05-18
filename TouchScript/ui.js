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
const runtime = document.getElementById("runtime");
const consoleOutput = document.getElementById("console-output");
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
}, {passive: true});

canvas.addEventListener("touchmove", function(event) {
  if (eventHandlers.ontouchmove) {
    for (const touch of event.changedTouches)
      eventHandlers.ontouchmove(touch.pageX * window.devicePixelRatio, touch.pageY * window.devicePixelRatio, touch.identifier);
  }
}, {passive: true});

canvas.addEventListener("touchend", function(event) {
  if (eventHandlers.ontouchend) {
    for (const touch of event.changedTouches)
      eventHandlers.ontouchend(touch.pageX * window.devicePixelRatio, touch.pageY * window.devicePixelRatio, touch.identifier);
  }

  event.preventDefault();
}, {passive: false});

canvas.addEventListener("mousedown", function(event) {
  if (eventHandlers.onmousedown) {
    eventHandlers.onmousedown(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.button);
  }
}, {passive: true});

canvas.addEventListener("mousemove", function(event) {
  if (eventHandlers.onmousemove) {
    eventHandlers.onmousemove(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.movementX * window.devicePixelRatio, event.movementY * window.devicePixelRatio);
  }
}, {passive: true});

canvas.addEventListener("mouseup", function(event) {
  if (eventHandlers.onmouseup) {
    eventHandlers.onmouseup(event.x * window.devicePixelRatio, event.y * window.devicePixelRatio, event.button);
  }

  event.preventDefault;
}, {passive: false});



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
    let outerDiv = list.firstChild;
    list.appendChild(outerDiv);
    loadRow(firstLoadedPosition + loadedCount, outerDiv);
    ++firstLoadedPosition;
  }
  
  while ((firstVisiblePosition - forwardBufferCount < firstLoadedPosition) && (firstLoadedPosition > 0)) {
    let outerDiv = list.lastChild;
    list.insertBefore(outerDiv, list.firstChild);
    loadRow(firstLoadedPosition - 1, outerDiv);
    --firstLoadedPosition;
  }
  
  spacer.style.height = firstLoadedPosition * rowHeight + "px";
  list.childNodes.forEach(touchCanceled);

  debug.firstChild.nodeValue = `[${firstLoadedPosition}, ${(firstLoadedPosition + loadedCount - 1)}]`;
};
window.onscroll();



document.body.onhashchange = function() {
  if (window.location.hash === "") {
    editor.style.display = "";
    runtime.style.display = "none";

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
    consoleOutput.textContent = "";

    editor.style.display = "none";
    runtime.style.display = "";
    
    try {
      script.getJavaScript() ();
    } catch (e) {
      //error = e;
      console.log(e);
      window.location.hash = "";
    }
    
    if (renderLoop === 0 && eventHandlers.ondraw)
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
  innerDiv.appendChild(append);
  innerDiv.appendChild(indentation);
  
  let outerDiv = document.createElement("div");
  outerDiv.classList.add("outer-row");
  outerDiv.appendChild(slideMenu);
  outerDiv.appendChild(innerDiv);
  
  outerDiv.touchId = -1;
  outerDiv.addEventListener("touchstart", touchStartHandler);
  outerDiv.addEventListener("touchmove", existingTouchHandler);
  outerDiv.addEventListener("touchend", existingTouchHandler);
  outerDiv.addEventListener("touchcancel", existingTouchHandler);
  
  return outerDiv;
}




function insertRow(position) {
  script.insertRow(position);

  let rowIndex = position - firstLoadedPosition;
  if (rowIndex >= 0 && rowIndex < list.childNodes.length) {
    let node = list.lastChild;
    loadRow(position, node);
    list.insertBefore(node, list.childNodes[rowIndex]);
  }
  else if (rowIndex < 0) {
    let node = list.lastChild;
    loadRow(firstLoadedPosition, node);
    list.insertBefore(node, list.firstChild);
  }

  updateLineNumbers(Math.max(0, rowIndex + 1));
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
    let outerRow = list.childNodes[i];
    let position = i + firstLoadedPosition;
    
    outerRow.firstChild.firstChild.firstChild.nodeValue = String(position).padStart(4);
    outerRow.childNodes[1].position = position;
  }
}



function loadRow(position, rowDiv, movedPosition = true) {
  let innerRow = rowDiv.childNodes[1];
  innerRow.position = position;
  
  //update the line number item of the slide menu
  innerRow.previousSibling.firstChild.firstChild.nodeValue = String(position).padStart(4);
  
  while (innerRow.childNodes.length > 2) {
    buttonPool.push(innerRow.lastChild);
    innerRow.removeChild(innerRow.lastChild);
  }

  if (position >= script.getRowCount()) {
    innerRow.childNodes[1].style.display = "none";
  } else {
    let itemCount = script.getItemCount(position);
    for (let col = 1; col < itemCount; ++col) {
      const [text, style] = script.getItem(position, col);
      
      let node = getItem(text);
      node.className = "item " + style;
      node.position = col;
      innerRow.appendChild(node);
    }
    
    const indentation = script.getIndentation(position);
    innerRow.childNodes[1].style.width = 6 * indentation + "px";
    innerRow.childNodes[1].style.display = (indentation === 0) ? "none" : "";
  }

  if (movedPosition) {
    let button = innerRow.childNodes[1 + modal.col];

    if (modal.row === position) {
      rowDiv.classList.add("selected");
      button.classList.add("selected");
      innerRow.scrollLeft = button.offsetLeft - window.innerWidth / 2;
    } else {
      rowDiv.classList.remove("selected");
      if (button)
        button.classList.remove("selected");
    }
  }
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
  document.body.classList.add("selected");
}

function closeModal() {
  modal.style.display = "none";
  document.body.classList.remove("selected");

  while (modal.hasChildNodes()) {
    buttonPool.push(modal.lastChild);
    modal.removeChild(modal.lastChild);
  }

  let rowIndex = modal.row - firstLoadedPosition;
  if (rowIndex >= 0 && rowIndex < list.childNodes.length) {
    let outerRow = list.childNodes[rowIndex];
    let innerRow = outerRow.childNodes[1];
    outerRow.classList.remove("selected");

    let button = innerRow.childNodes[1 + modal.col];
    button.classList.remove("selected");
  }

  modal.row = -1;
  modal.col = -1;
}



function preventDefault(e) {
  e.preventDefault();
}

function modalContainerClicked(event) {
  event.stopPropagation();
  event.preventDefault();
  closeModal();
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

  if (options.length > 0) {
    configureModal(options, row, -1);
    event.currentTarget.parentElement.parentElement.classList.add("selected");
    event.currentTarget.classList.add("selected");
  }
}

function menuItemClicked(payload) {
  while (modal.hasChildNodes()) {
    buttonPool.push(modal.lastChild);
    modal.removeChild(modal.lastChild);
  }

  let response = script.menuItemClicked(modal.row, modal.col, payload);

  if (typeof response === 'number') {
    if ((response & Script.RESPONSE.ROW_UPDATED) !== 0) {
      let outerRow = list.childNodes[modal.row - firstLoadedPosition];
      if (outerRow) {
        loadRow(modal.row, outerRow, false);
        if (modal.col === -1) {
          outerRow.childNodes[1].scrollLeft = 1e10;
        }
      }
    }

    if ((response & Script.RESPONSE.ROWS_INSERTED) !== 0) {
      insertRow(modal.row + 1);
    }

    if (response === Script.RESPONSE.ROW_DELETED) {
      deleteRow(modal.row);
    }

    if (response === Script.RESPONSE.SCRIPT_CHANGED) {
      for (const outerRow of list.childNodes) {
        loadRow(outerRow.childNodes[1].position, outerRow, false);
      }
    }

    document.body.style.height = getRowCount() * rowHeight + "px";
  }
  else if (Array.isArray(response) && response.length > 0) {
    configureModal(response, modal.row, modal.col);
    return;
  }

  closeModal();
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
    if (options.length > 0) {
      configureModal(options, row, col);
      event.currentTarget.parentElement.parentElement.classList.add("selected");
      event.currentTarget.classList.add("selected");
    }
  }
  else {
    button.firstChild.nodeValue = options.text;
    button.className = "item " + options.style;
  }
}



function touchStartHandler(event) {
  let outerRow = event.currentTarget;
  let touch = event.changedTouches[0];
  
  if (outerRow.touchId === -1) {
    outerRow.touchId = touch.identifier;
    outerRow.touchStartX = touch.pageX + outerRow.childNodes[1].scrollLeft;
    
    outerRow.firstChild.classList.remove("slow-transition");
    outerRow.slideMenuStartWidth = outerRow.firstChild.offsetWidth;
  }
}


function existingTouchHandler(event) {
  const outerRow = event.currentTarget;

  for (const touch of event.changedTouches) {
    if (touch.identifier === outerRow.touchId) {
      switch (event.type) {
        case "touchmove":
          touchMoved(outerRow, touch);
          if (outerRow.touchCaptured)
            event.preventDefault();
        break;

        case "touchend":
          touchEnded(outerRow, touch);
        break;

        case "touchcancel":
          touchCanceled(outerRow);
        break;
      }
    }
  }
}


function touchMoved(outerRow, touch) {
  let travel = touch.pageX - outerRow.touchStartX;
  
  if (!outerRow.touchCaptured && travel > 10) {
    outerRow.touchCaptured = true;
    outerRow.touchStartX += 10;
    travel -= 10;
  }
  
  if (outerRow.touchCaptured) {
    if (travel < 0) {
      outerRow.touchStartX = touch.pageX;
      travel = 0;
    }

    outerRow.firstChild.style.width = outerRow.slideMenuStartWidth + travel + "px";
  }
}


function touchEnded(outerRow, touch) {
  if (outerRow.touchCaptured) {
    const position = outerRow.childNodes[1].position;
    if (position < script.getRowCount()) {
      let travel = touch.pageX - outerRow.touchStartX;
      
      if (travel > 200) {
        deleteRow(position);
      } else if (travel > 80) {
        insertRow(position + 1);
      }
    }

    touchCanceled(outerRow);
  }
  
  outerRow.touchId = -1;
}


function touchCanceled(outerRow) {
  outerRow.touchId = -1;
  outerRow.firstChild.classList.add("slow-transition");
  outerRow.firstChild.style.width = "";
  outerRow.touchCaptured = false;
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

function print(output) {
  consoleOutput.textContent += output + "\n";
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}