var screenHeight;
var itemPoolSize = 0;
var visibleItemCount = 0;
let itemHeight = 30;
var firstLoadedItemIndex = 0;
var firstVisibleItemIndex = 0;
let itemCount = Math.floor(2**24 / itemHeight);

var list = document.getElementById("list"); //a div containing all elements
var spacer = document.getElementById("spacer"); //a div that changes size to offset elements
var debug = document.getElementById("debug");

function resizeListener() {
	screenHeight = window.innerHeight;
	document.body.style.height = itemCount * itemHeight + "px";
	
	visibleItemCount = Math.ceil(screenHeight / itemHeight);
	var newitemPoolSize = visibleItemCount + 6;
	var diff = newitemPoolSize - itemPoolSize;
	itemPoolSize = newitemPoolSize;
	
	if (diff > 0) {
		for(var i = 0; i < diff; ++i) {
			var div = document.createElement("div");
			div.classList.add("item");
			
			let position = list.childNodes.length + firstLoadedItemIndex;
			
			//if the user is scrolled all the way to the bottom, prepend instead of appending
			if (position <= itemCount) {
				list.insertBefore(div, list.firstChild);
				appendItem(position);
			} else {
				list.append(div);
				prependItem(firstLoadedItemIndex - 1);
				--firstLoadedItemIndex;
				spacer.style.height = firstLoadedItemIndex * itemHeight + "px";
			}
		}
	} else if (diff < 0) {
		diff = -diff;
		for (var i = 0; i < diff; ++i) {
			let lastChild = list.childNodes[list.childNodes.length - 1];
			list.removeChild(lastChild);
		}
	}
	
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	updateDebug();
}

window.onscroll = function() {
	firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	//user scrolled so far down all items are off screen
	if (firstVisibleItemIndex >= firstLoadedItemIndex + itemPoolSize) {
		//set the first loaded item far above the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex - itemPoolSize - 2;
		
		let position = firstLoadedItemIndex + itemPoolSize;
		list.childNodes[list.childNodes.length - 1].innerHTML = position;
	}
	
	//user scrolled so far up all items are off screen
	if (firstVisibleItemIndex <= firstLoadedItemIndex - itemPoolSize) {
		//set the first loaded item far below the viewport so the following loop refills the screen
		firstLoadedItemIndex = firstVisibleItemIndex + itemPoolSize;
		
		let position = firstLoadedItemIndex;
		list.firstChild.innerHTML = position;
	}
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleItemIndex - 4 > firstLoadedItemIndex) && (firstLoadedItemIndex < itemCount - itemPoolSize)) {
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

function appendItem(position) {
	position = position|0;
	
	var firstChild = list.firstChild;
	firstChild.innerHTML = fancyElementFunction(position);
	list.removeChild(firstChild);
	list.appendChild(firstChild);
}

function prependItem(position) {
	position = position|0;
	
	var lastChild = list.childNodes[list.childNodes.length - 1];
	lastChild.innerHTML = fancyElementFunction(position);
	list.removeChild(lastChild);
	list.insertBefore(lastChild, list.firstChild);
}

function fancyElementFunction(position) {
	position = position|0;
	
	return position;
}

function updateDebug() {
	var debugText = "scrollY: " + window.scrollY + "<br>"
			+ "loaded items: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + itemPoolSize - 1) + "]<br>"
			+ "visible items: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
	debug.innerHTML = debugText;
}

//this div element is given a text element child by default, so I get rid of it
list.removeChild(list.firstChild);

resizeListener();
onscroll();