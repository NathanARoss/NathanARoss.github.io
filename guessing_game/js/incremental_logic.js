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
	} else if (guess == answer) {
		sendOutput("ding ding ding! The answer is " + answer);
		sendOutput("");
		startNewGame();
	}
}

function startNewGame() {
	sendOutput("Guess my number between 1 and 100");
	answer = Math.floor(Math.random() * 100) + 1;
}