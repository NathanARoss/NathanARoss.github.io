var screenHeight;
var itemPoolSize = 0;
var visibleItemCount = 0;
let itemHeight = 60;
var firstLoadedItemIndex = 0;
let itemCount = 10000;

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
			var p = document.createElement("p");
			p.classList.add("item");
			
			p.appendChild(document.createTextNode(i));
			//p.appendChild(document.createElement("br"));
			//p.appendChild(document.createTextNode(i));
			
			var div = document.createElement("div");
			div.classList.add("item");

			div.appendChild(p);
			list.appendChild(div);
		}
	} else if (diff < 0) {
		diff = -diff;
		let length = list.childNodes.length;
		for (var i = 0; i < diff; ++i) {
			var pos = length - 1 - i;
			console.log("removing child at " + pos);
			var child = list.childNodes[pos];
			list.removeChild(child);
		}
	}
}

window.onscroll = function() {
	let firstVisibleItemIndex = Math.floor(window.scrollY / itemHeight);
	
	//keep a buffer of 2 unseen elements in either direction
	while ((firstVisibleItemIndex - 4 > firstLoadedItemIndex) && (firstLoadedItemIndex < itemCount - itemPoolSize)) {
		var firstChild = list.firstChild;
		firstChild.innerHTML = (itemPoolSize + firstLoadedItemIndex);
		list.removeChild(firstChild);
		list.appendChild(firstChild);
		++firstLoadedItemIndex;
		
		spacer.style.height = firstLoadedItemIndex * itemHeight + "px";
	}
	
	while ((firstVisibleItemIndex - 2 < firstLoadedItemIndex) && (firstLoadedItemIndex > 0)) {
		var lastChild = list.childNodes[list.childNodes.length - 1];
		lastChild.innerHTML = (firstLoadedItemIndex - 1);
		list.removeChild(lastChild);
		list.insertBefore(lastChild, list.firstChild);
		--firstLoadedItemIndex;
		
		spacer.style.height = firstLoadedItemIndex * itemHeight + "px";
	}
	
	var debugText = "scrollY: " + window.scrollY + "<br>"
					+ "loaded items: [" + firstLoadedItemIndex + ", " + (firstLoadedItemIndex + itemPoolSize - 1) + "]<br>"
					+ "visible items: [" + firstVisibleItemIndex + ", " + (firstVisibleItemIndex + visibleItemCount - 1) + "]";
	debug.innerHTML = debugText;
}

//this div element is given a text element child by default, so I get rid of it
list.removeChild(list.firstChild);

resizeListener();
onscroll();