var screenHeight;
var itemCapacity = -4;
let itemHeight = 50;
var list = document.getElementById("list");
var spacer = document.getElementById("spacer");
var oldTopIndex = 0;
let maxIndex = 500;

function resizeListener() {
	screenHeight = window.innerHeight;
	document.body.style.height = maxIndex * itemHeight + screenHeight;
	
	//console.log("oldCapacity " + itemCapacity);
	
	var oldCapacity = itemCapacity;
	itemCapacity = Math.ceil(screenHeight / itemHeight);
	var diff = itemCapacity - oldCapacity;
	
	//console.log("itemCapacity " + itemCapacity);
	//console.log("screenHeight " + screenHeight);
	
	if (diff > 0) {
		for(var i = 0; i < diff; ++i) {
			var p = document.createElement("p");
			p.style.padding = "10px";
			p.style.outerHeight = itemHeight + "px"
			var node = document.createTextNode(i);
			p.appendChild(node);
			p.style.backgroundColor = "#DDDDDD";
			list.appendChild(p);
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
	var topIndex = Math.floor(window.scrollY / itemHeight);
	if (topIndex > maxIndex) {
		topIndex = maxIndex;
	}
	
	spacer.style.height = topIndex * itemHeight + "px";
	
	while (topIndex > oldTopIndex) {
		var firstChild = list.firstChild;
		firstChild.innerHTML = oldTopIndex;
		list.removeChild(firstChild);
		list.appendChild(firstChild);
		++oldTopIndex;
	}
	
	while (topIndex < oldTopIndex) {
		var lastChild = list.childNodes[list.childNodes.length - 1];
		firstChild.innerHTML = oldTopIndex;
		list.removeChild(lastChild);
		list.insertBefore(lastChild, list.firstChild);
		--oldTopIndex;
	}
}

resizeListener();