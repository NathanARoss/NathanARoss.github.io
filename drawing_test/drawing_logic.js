let canvas = document.getElementById("myCanvas");
let context = canvas.getContext("2d");
const callInterval = 16;

let theta = 0.0;
let centerX, centerY;
let time = 0.0;

let objects = [];

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
	//context.clearRect(0, 0, canvas.width, canvas.height);
	
	for (let i = 0; i < objects.length; ++i) {
		let ball = objects[i];
		ball.x += ball.vx;
		ball.y += ball.vy;
		
		const radius2 = (ball.x - centerX) ** 2 + (ball.y - centerY) ** 2;
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
	
	requestAnimationFrame(draw);
}

function getRandomColor() {
	let constters = '0123456789ABCDEF';
	let color = '#';
	for (let i = 0; i < 6; i++) {
		color += constters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function generateObjects() {
	objects = [];
	
	for (let i = 0; i < 200; ++i) {
		let ball = new Object();
		ball.x = Math.random() * canvas.width;
		ball.y = Math.random() * canvas.height;
		
		const radius = ((ball.x - centerX) ** 2 + (ball.y - centerY) ** 2) ** 0.55;
		
		ball.px = ball.x;
		ball.py = ball.y;
		ball.vx = (ball.y - centerY) / radius;
		ball.vy = -(ball.x - centerX) / radius;
		ball.color = getRandomColor();
		objects.push(ball);
	}
}

resize_canvas();
requestAnimationFrame(draw);