var answer = 0

function entryPoint() {
	startNewGame();
}

function processInput(input) {
	
	let guess = parseInt(input);
	
	if (guess < answer) {
		sendOutput(guess + " is too low");
	} else if (guess > answer) {
		sendOutput(guess + " is too high");
	} else {
		sendOutput("ding ding ding! The answer is " + answer + "<br>");
		startNewGame();
	}
}

function startNewGame() {
	sendOutput("Guess my integer between 1 and 100 inclusive");
	answer = Math.floor(Math.random() * 100) + 1;
}