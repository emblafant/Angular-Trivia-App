import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

interface Category {
  id: number;
  name: string;
}

interface Question {
  category: string;
  correct_answer: string;
  difficulty: string;
  incorrect_answers: string[];
  question: string;
  type: string;
  answers: string[];
}

enum StateType {
  START = 'start',
  QUIZ = 'quiz',
  RESULT = 'result',
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
})
export class AppComponent {
  state: StateType = StateType.START; //Which part of the quix is active and should be showing
  categories: Category[] = []; //All categories the player can choose from
  sessionToken: string = '';
  selectedCategory: string = ''; //The category the player has selected
  selectedDifficulty: string = ''; //The difficulty the player has selected
  questionAmount: number = 7; //How many questions the quiz should contain
  triviaQuestions: Question[] = []; //The fetched trivia questions for the current round
  activeQuestion: number = 0; //The active question that is now displaying
  currentScore: number = 0; //The current score of the round
  answerFeedback: string = ''; //Response if the player got the question right or not and what the correct answer is
  timerSecs = 31; //How many secs the countdown timer is
  timeLeft: number = this.timerSecs; //Time left och the countdown timer
  timerRunning: boolean = false; //Is the timmer running
  timesUp: boolean = false; //Is the time on the countdown up?

  //Get the value of the selected category
  onSelectedCategory(value: string) {
    this.selectedCategory = value;
  }

  //The the difficulty of the selected category
  onSelectedDifficulty(value: string) {
    this.selectedDifficulty = value;
  }

  //Start the quiz
  onStartQuiz() {
    //Fetch questions
    this.loadTriviaQuestions()
      .then(() => {
        this.state = StateType.QUIZ; //Change the state so the quiz part of the page is showing
        //Start and reset timer
        this.resetTimer();
        this.timerRunning = true;
      })
      .catch((err) =>
        console.log('Could not load trivia questions, err:' + err.toString())
      );
  }

  //Check if the user got the question right or wrong
  onCheckAnswer(value: string) {
    this.timerRunning = false; //Stop the timer
    //If user got the question right
    if (this.triviaQuestions[this.activeQuestion].correct_answer == value) {
      this.answerFeedback = `Correct! The answer was "${value}"!`; //Set feedback message
      this.currentScore += 1; //Add point to score
    } else {
      //If user got the question wrong set this feedback message
      this.answerFeedback = `Incorrect! The correct answer was "${
        this.triviaQuestions[this.activeQuestion].correct_answer
      }".`;
    }
  }

  //Displays next question
  onNextQuestion() {
    //Start and reset timer
    this.resetTimer();
    this.timerRunning = true;
    //Checks if previous question was the last question
    if (this.activeQuestion + 1 == this.triviaQuestions.length) {
      this.state = StateType.RESULT; //Change the state so that the page displays the result section
    }
    this.activeQuestion += 1; //Set active question the the next on in the array
    this.answerFeedback = ''; //Reset feedback message
  }

  //Start new game
  onNewGame() {
    this.state = StateType.START; //Set the state so that the start section of the page is showing
    this.activeQuestion = 0; //Reset active question
    this.currentScore = 0; //Reset score
    this.selectedCategory = ''; //Reset selected category
    this.selectedDifficulty = ''; //REset difficulty
    this.resetTimer(); //Reset timer
  }

  //Start the interval of the timer
  startTimer() {
    //Every 1 sec
    setInterval(() => {
      //If timer is running, remove 1 sec from time left
      if (this.timerRunning) this.timeLeft -= 1;
      //If timer reach 0
      if (this.timeLeft <= 0) {
        this.timesUp = true;
        this.timerRunning = false; //Turn of timer
      }
    }, 1000);
  }

  //Reset timer
  resetTimer() {
    this.timeLeft = this.timerSecs; //Restore time left
    this.timesUp = false;
  }

  //Fetch trivia questions
  async loadTriviaQuestions() {
    return new Promise<void>(async (resolve, reject) => {
      //Checks if user has chosen a difficulty, if not use empty string
      let difficultyParam = '';
      if (this.selectedDifficulty)
        difficultyParam = '&difficulty=' + this.selectedDifficulty;
      //Creat url with right params
      const url = `https://opentdb.com/api.php?amount=${this.questionAmount}&category=${this.selectedCategory}${difficultyParam}&token=${this.sessionToken}`;
      this.http.get(url).subscribe(async (res: any) => {
        //Check if session token is empty or does not exist, if that is true get an new token and get questions again
        if (res.response_code == 3 || res.response_code == 4) {
          this.loadSessionToken()
            .then(() => {
              this.loadTriviaQuestions()
                .then(() => resolve())
                .catch((err) => {
                  console.log(
                    'Error loading trivia questions, err:' + err.toString()
                  );
                  reject(err);
                  return;
                });
            })
            .catch((err) => {
              console.log('Error loading session token, err:' + err.toString());
              reject(err);
              return;
            });

          return;
        }
        this.triviaQuestions = res.results; //Save questions
        //Create an array for the possible answers to the question and randomize the order of them
        this.triviaQuestions.forEach((tq: Question) => {
          let arr = [...tq.incorrect_answers];
          let randomIndex = Math.floor(Math.random() * (arr.length + 1));
          arr.splice(randomIndex, 0, tq.correct_answer);
          tq.answers = arr;
        });
        resolve();
      });
    });
  }

  constructor(private http: HttpClient) {
    this.loadCategories();
    //Check if session token already exisits, if not, get one
    if (!this.sessionToken) this.loadSessionToken();
    this.startTimer();
  }

  //Get and save categories
  loadCategories() {
    this.http
      .get('https://opentdb.com/api_category.php')
      .subscribe((res: any) => {
        this.categories = res.trivia_categories; //Save categories
        this.selectedCategory = res.trivia_categories[0].id; //Set selected category as the first in the array as default option
      });
  }

  //Get and save session token
  loadSessionToken() {
    return new Promise<void>(async (resolve, _reject) => {
      this.http
        .get('https://opentdb.com/api_token.php?command=request')
        .subscribe((res: any) => {
          this.sessionToken = res.token; //Save token
          resolve();
        });
    });
  }
}
