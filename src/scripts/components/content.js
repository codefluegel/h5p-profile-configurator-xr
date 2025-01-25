import PDFExporter from '@services/pdf-exporter.js';
import Util from '@services/util.js';
import MediaScreen from '@components/media-screen/media-screen.js';
import MessageBoxHint from '@components/message-box/message-box-hint.js';
import QuestionScreen from '@components/question-screen/question-screen.js';
import ResultScreen from '@components/result-screen/result-screen.js';
import WheelOfFortune from '@components/wheel-of-fortune/wheel-of-fortune.js';

export default class Content {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      personalities: [],
      questions: [],
      previousState: {}
    }, params);

    this.callbacks = Util.extend({
      onReset: () => {}
    }, callbacks);

    // Compute score matrix
    this.scoreMatrix = this.params.questions.map((question) => {
      return question.answers.map((answer) => {
        return answer.personality.split(',').map((benefitPersonality) => {
          const segments = benefitPersonality.split('=');
          const score = Number(segments.pop());
          const beneficiary = segments.join('=');
          const personalityIndex = this.params.personalities
            .findIndex((personality) => {
              return personality.name.toLowerCase() === beneficiary;
            });

          return {
            personalityIndex: personalityIndex,
            score: score
          };
        });
      });
    });

    this.answersGiven = this.params.previousState.answersGiven ?? [];

    const done = this.buildDOM();
    if (!done) {
      return;
    }

    if (!this.params.delegateRun) {
      this.reset();
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build DOM.
   * @returns {boolean} True, if done fine.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-profile-configurator-content');

    if (!this.params.personalities.length) {
      this.messageBoxHint = new MessageBoxHint();
      this.messageBoxHint.setText(
        this.params.dictionary.get('l10n.noPersonalities')
      );
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    if (!this.params.questions.length) {
      this.messageBoxHint = new MessageBoxHint();
      this.messageBoxHint.setText(
        this.params.dictionary.get('l10n.noQuestions')
      );
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    // Question screen
    this.questionScreen = new QuestionScreen(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        appearance: this.params.appearance,
        questions: this.params.questions,
        colorProgressBar: this.params.colorProgressBar,
        isAnimationOn: this.params.isAnimationOn,
        showProgressBar: this.params.showProgressBar,
        allowReview: this.params.allowReview
      },
      {
        onCompleted: () => {
          this.handleCompleted();
        }
      }
    );
    this.questionScreen.hide();
    this.dom.append(this.questionScreen.getDOM());

    if (
      !this.params.delegateResults &&
      this.params.resultScreen.animation === 'wheel'
    ) {
      // Wheel of fortune
      this.wheelOfFortune = new WheelOfFortune({
        globals: this.params.globals,
        segments: this.params.personalities.map((personality) => {
          return {
            text: personality.name,
            image: personality.image,
            uuid: H5P.createUUID()
          };
        }),
        l10n: {
          skip: this.params.dictionary.get('l10n.skip')
        },
        a11y: {
          started: this.params.dictionary.get('a11y.wheelStarted')
        }
      });
      this.wheelOfFortune.hide();
      this.dom.append(this.wheelOfFortune.getDOM());
    }

    // Title screen if set
    if (this.params.titleScreen) {
      this.intro = document.createElement('div');
      this.intro.classList.add('h5p-profile-configurator-content-intro');

      this.startScreen = new MediaScreen({
        id: 'start',
        contentId: this.params.globals.get('contentId'),
        introduction: this.params.titleScreen.titleScreenIntroduction,
        medium: this.params.titleScreen.titleScreenMedium,
        maxMediumHeight: this.params.titleScreen.maxHeight,
        globals: this.params.globals,
        buttons: [
          { id: 'start', text: this.params.dictionary.get('l10n.start') }
        ],
        a11y: {
          screenOpened: this.params.dictionary.get('a11y.titleScreenWasOpened')
        }
      }, {
        onButtonClicked: () => {
          this.handleTitleScreenClosed();
        },
        onRead: (text) => {
          this.params.globals.get('read')(text);
        }
      });

      this.startScreen.hide();
      this.intro.append(this.startScreen.getDOM());

      this.dom.append(this.intro);
    }

    // Result screen
    this.resultScreen = new ResultScreen(
      {
        ...(this.params.resultScreen),
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        allowReview: this.params.allowReview,
        l10n: {
          notFinished: this.params.dictionary.get('l10n.notFinished'),
          reset: this.params.dictionary.get('l10n.reset'),
          review: this.params.dictionary.get('l10n.review'),
          download: this.params.dictionary.get('l10n.download')
        },
        a11y: {
          resultsTitle: this.params.dictionary.get('a11y.resultsTitle')
        }
      },
      {
        onReset: () => {
          this.callbacks.onReset();
        },
        onDownload: () => {
          this.exportPDF();
        },
        onBack: () => {
          this.isReviewing = true;
          this.resultScreen.hide();
          this.questionScreen.moveToPanel(this.params.questions.length - 1);
          this.questionScreen.show({ focus: true });

          this.params.globals.get('resize')();
        }
      }
    );
    this.resultScreen.hide();
    this.dom.append(this.resultScreen.getDOM());

    return true;
  }

  /**
   * Resize.
   */
  resize() {
    this.wheelOfFortune?.resize();
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    if (!this.resultScreen) {
      return {}; // Not ready yet
    }

    const results = this.resultScreen.getCurrentState();

    return {
      panelIndex: this.getCurrentPosition(),
      answersGiven: this.getAnswersGiven(),
      panelsCompleted: this.getPanelsCompleted(),
      ...(results && { results: results })
    };
  }

  /**
   * Get panels completed.
   * @returns {[boolean]} Panels completed with true if yes, false if no.
   */
  getPanelsCompleted() {
    return this.questionScreen.getPanelsCompleted();
  }

  /**
   * Check if answer was given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    const choices = this.questionScreen?.getChoices() ?? [];

    for (const panel of choices) {
      if (panel.options.some((option) => option.selected)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get current position.
   * @returns {number} Current position.
   */
  getCurrentPosition() {
    return this.questionScreen?.getCurrentPanelIndex() ?? 0;
  }

  /**
   * Get results for result screen.
   * @returns {object} Results.
   */
  getResults() {
    return this.resultScreen?.getResults() ?? {};
  }

  /**
   * Handle title screen closed.
   */
  handleTitleScreenClosed() {
    this.questionScreen.show({ focus: true });

    this.params.globals.get('resize')();
  }

  /**
   * Get scores.
   * @returns {number[]} Scores for each personality.
   */
  getScores() {
    const scores = new Array(this.params.personalities.length).fill(0);

    const choices = this.questionScreen.getChoices();

    choices.forEach((choice, questionIndex) => {
      choice.options.forEach((option, optionIndex) => {
        if (!option.selected) {
          return;
        }

        const scoresToAdd = this.scoreMatrix[questionIndex][optionIndex];
        scoresToAdd.forEach((scoreEntry) => {
          scores[scoreEntry.personalityIndex] += scoreEntry.score;
        });
      });
    });

    return scores;
  }

  /**
   * Get all answers given.
   * @returns {object[]} Answers given.
   */
  getAnswersGiven() {
    const choices = this.questionScreen.getChoices();

    const answersGiven = choices
      .map((choice, panelIndex) => {
        const options = choice.options
          .map((option, index) => (option.selected ? index : -1))
          .filter((index) => index !== -1);

        return options.length ? { question: panelIndex, options } : null;
      })
      .filter((answer) => answer !== null);

    return answersGiven;
  }

  /**
   * Handle completed.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isFromReset] If true, don't focus, etc.
   */
  handleCompleted(params = {}) {
    // Determine one personality with highest score
    const scores = this.getScores();

    const maxScore = Math.max(...scores);
    const winnerIndexes = scores.reduce((winners, current, index) => {
      return (current !== maxScore) ?
        winners :
        [...winners, index];
    }, []);

    const winnerIndex = winnerIndexes[
      Math.floor(Math.random() * winnerIndexes.length)
    ];

    // Update result if user was reviewing or not already completed before
    if (this.isReviewing || !this.resultScreen.getCurrentState() | !params.isFromReset) {
      this.resultScreen.setContent({
        personality: this.params.personalities[winnerIndex],
        choices: this.questionScreen.getChoices()
      });
      this.params.globals.get('triggerXAPIEvent')('completed');
    }

    if (this.params.delegateResults) {
      return;
    }

    this.questionScreen.hide();

    if (this.params.resultScreen.animation === 'wheel' && !params.isFromReset) {
      this.wheelOfFortune?.show();
      this.wheelOfFortune?.focus();
      this.params.globals.get('resize')();

      this.wheelOfFortune.spinTo(winnerIndex, () => {
        this.wheelOfFortune.hide({ fade: true, onHidden: () => {
          this.resultScreen.show();
          if (!params.isFromReset) {
            this.resultScreen.focus();
          }

          this.params.globals.get('resize')();
        } });
      });
    }
    else if (this.params.resultScreen.animation === 'fade-in') {
      this.resultScreen.show({ fade: true });
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      this.params.globals.get('resize')();
    }
    else {
      this.resultScreen.show();
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      this.params.globals.get('resize')();
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.showInstantly] If true, don't animate anything.
   * @param {boolean} [params.focus] If true, set focus.
   */
  reset(params = {}) {
    if (!this.questionScreen) {
      return; // Not set up
    }

    this.isReviewing = false;

    const answersGiven = params.cleanSlate ? [] : this.params.previousState.answersGiven ?? [];
    const panelIndex = params.cleanSlate ? 0 : this.params.previousState.panelIndex ?? 0;
    const panelsCompleted = this.params.previousState.panelsCompleted ?? [];

    this.questionScreen?.reset({
      answersGiven: answersGiven,
      panelIndex: panelIndex,
      panelsCompleted: panelsCompleted
    });
    this.wheelOfFortune?.hide();
    this.resultScreen?.hide();
    this.resultScreen?.reset();

    /*
     * Result may be chosen randomly on equal scores for personalities, so
     * use saved result if present.
     */
    if (this.params.previousState.results) {
      this.resultScreen.setContent({
        choices: this.questionScreen.getChoices(),
        personality: this.params.personalities.find((personality) => {
          return personality.name === this.params.previousState.results;
        })
      });
    }

    // Only use previous state for first call to reset after initialization
    this.params.previousState = {};

    if (params.showInstantly) {
      this.questionScreen.show({
        focus: params.focus,
        showInstantly: params.showInstantly
      });
    }
    else if (
      this.params.delegateRun &&
      this.getCurrentPosition() !== this.params.questions.length
    ) {
      this.questionScreen.show({ focus: params.focus });
    }
    else if (this.params.titleScreen && !this.getAnswerGiven()) {
      this.startScreen.show({
        focusButton: params.focus,
        readOpened: params.focus
      });
    }
    else if (this.getCurrentPosition() !== this.params.questions.length) {
      this.questionScreen.show({ focus: !!params.focus });
    }
    else {
      this.handleCompleted({ isFromReset: true });
    }

    this.params.globals.get('resize')();
  }

  /**
   * Run content.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.focus] If true. set focus.
   */
  run(params = {}) {
    this.reset(params);
  }

  /**
   * Export PDF.
   */
  async exportPDF() {
    await new PDFExporter().export({
      elements: this.resultScreen.getExportElements()
    });
  }
}
