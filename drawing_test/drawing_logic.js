var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");

var theta = 0.0;
var centerX, centerY;
var time = 0.0;

function resize_canvas() {
	context.canvas.width = window.innerWidth;
	context.canvas.height = window.innerHeight;
	centerX = canvas.width / 2.0;
	centerY = canvas.height / 2.0;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.font = "30px Arial";
	context.fillText("" + canvas.width + "x" + canvas.height,30,30); 
}

function draw() {
	//clear canvas
	//context.beginPath();
	//context.clearRect(0, 0, canvas.width, canvas.height);
	
	let radius = Math.sin(time * 0.0201) * (canvas.width / 3.0);
	var x = Math.floor(Math.cos(theta) * radius + centerX);
	var y = Math.floor(Math.sin(theta) * radius + centerY);
	context.moveTo(x,y);
	
	theta += 0.1;
	time += 1.0;
	
	radius = Math.sin(time * 0.0201) * (canvas.width / 3.0);
	x = Math.floor(Math.cos(theta) * radius + centerX);
	y = Math.floor(Math.sin(theta) * radius + centerY);
	context.lineTo(x,y);
	context.stroke();
}

resize_canvas();
setInterval(draw, 33);