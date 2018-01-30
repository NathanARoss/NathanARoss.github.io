var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");
let callInterval = 16;

var theta = 0.0;
var centerX, centerY;
var time = 0.0;

var objects = [];

function resize_canvas() {	
	context.canvas.width = window.innerWidth;
	context.canvas.height = window.innerHeight;
	centerX = canvas.width / 2.0;
	centerY = canvas.height / 2.0;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.font = "30px Arial";
	context.fillText("" + canvas.width + "x" + canvas.height,100,100);
	
	context.lineWidth = canvas.width / 100.0;
	
	generateObjects();
}

function draw() {
	//clear canvas
	//context.beginPath();
	//context.clearRect(0, 0, canvas.width, canvas.height);
	
	for (var i = 0; i < objects.length; ++i) {
		var ball = objects[i];
		ball.x += ball.vx;
		ball.y += ball.vy;
		
		let radius2 = (ball.x - centerX) ** 2 + (ball.y - centerY) ** 2;
		ball.vx -= (ball.x - centerX) / radius2;
		ball.vy -= (ball.y - centerY) / radius2;
		
		context.beginPath();
		context.moveTo(ball.px, ball.py);
		context.lineTo(ball.x, ball.y);
		context.strokeStyle = ball.color;
		context.stroke();
		
		ball.px = ball.x;
		ball.py = ball.y;
	}
}

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function generateObjects() {
	objects = [];
	
	for (var i = 0; i < 200; ++i) {
		var ball = new Object();
		ball.x = Math.random() * canvas.width;
		ball.y = Math.random() * canvas.height;
		
		let radius = ((ball.x - centerX) ** 2 + (ball.y - centerY) ** 2) ** 0.55;
		
		ball.px = ball.x;
		ball.py = ball.y;
		ball.vx = (ball.y - centerY) / radius;
		ball.vy = -(ball.x - centerX) / radius;
		ball.color = getRandomColor();
		objects.push(ball);
	}
}

resize_canvas();
setInterval(draw, callInterval);