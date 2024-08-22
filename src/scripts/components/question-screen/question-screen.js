import Util from '@services/util.js';
import NavigationBar from './navigation-bar/navigation-bar.js';
import Panel from './panel/panel.js';
import ProgressBar from './progress-bar/progress-bar.js';
import './question-screen.scss';

export default class QuestionScreen {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.questions] Question data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onAnswerGiven] Callback on answer given.
   * @param {function} [callbacks.onCompleted] Callback when all is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      questions: [{}]
    }, params);

    this.callbacks = Util.extend({
      onAnswerGiven: () => {},
      onCompleted: () => {}
    }, callbacks);

    this.currentPanelIndex = 0;

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-xr-question-screen');

    // Progressbar
    this.progressBar = new ProgressBar({
      valueMin: 1,
      valueMax: this.params.questions.length,
      baseColor: this.params.colorProgressBar,
      isAnimated: this.params.isAnimationOn,
      l10n: {
        currentOfTotal: this.params.dictionary.get('l10n.currentOfTotal')
      },
      a11y: {
        progressbar: this.params.dictionary.get('a11y.progressBar')
      }
    });
    if (!this.params.showProgressBar) {
      this.progressBar.hide();
    }

    this.dom.append(this.progressBar.getDOM());

    // Panels
    this.panels = this.params.questions.map((question, questionIndex) => {
      const panel = new Panel({
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        appearance: this.params.appearance,
        image: question.image,
        questionText: question.text,
        answerOptions: question.answers,
        animation: this.params.isAnimationOn,
        allowsMultipleChoices: question.allowsMultipleChoices
      },
      {
        onOptionChosen: () => {
          this.updateNavigationButtons();
          if (!question.allowsMultipleChoices) {
            this.navigationBar?.focusButton('next');
          }
        },
        onAnswerGiven: (optionIndexes) => {
          this.callbacks.onAnswerGiven({
            questionIndex: questionIndex,
            optionIndexes: optionIndexes
          });
        },
        onCompleted: () => {
          this.handlePanelCompleted(questionIndex);
        }
      });

      panel.hide();

      return panel;
    });

    this.panelWrapper = document.createElement('div');
    this.panelWrapper.classList.add('h5p-personality-quiz-xr-panel-wrapper');
    this.dom.append(this.panelWrapper);

    this.panels.forEach((panel) => {
      this.panelWrapper.append(panel.getDOM());
    });

    if (this.params.appearance === 'classic') {
      this.navigationBar = new NavigationBar({
        allowReview: this.params.allowReview,
        a11y: {
          back: this.params.dictionary.get('a11y.previous'),
          next: this.params.dictionary.get('a11y.next')
        }
      }, {
        onClicked: (buttonId) => {
          this.handleNavigationButtonClicked(buttonId);
        }
      });
      this.dom.append(this.navigationBar.getDOM());
    }

    this.progressBar.setProgress(this.currentPanelIndex + 1);

    this.updateNavigationButtons();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');

    if (params.focus) {


      this.panels[this.currentPanelIndex].focus();
    }
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {object[]} [params.answersGiven] Previously given answers.
   * @param {boolean} [params.focus] If true, set focus to relevant panel.
   */
  showInAction(params = {}) {
    params = Util.extend({ answersGiven: [] }, params);

    const lastQuestionIndex = params.answersGiven.length;

    this.panels.forEach((panel, index) => {
      if (index === lastQuestionIndex) {
        this.params.globals.get('triggerXAPIEvent')('progressed');
      }

      if (this.params.appearance === 'classic' && index === lastQuestionIndex) {
        panel.show({ focus: params.focus });
      }
      else if (this.params.appearance === 'chat' && index < lastQuestionIndex) {
        panel.show({
          showInstantly: true,
          focus: false
        });
      }
      else if (this.params.appearance === 'chat' && index === lastQuestionIndex) {
        panel.show({
          showInstantly: params.showInstantly,
          focus: params.focus
        });
      }
      else {
        panel.hide();
      }
    });

    this.show();
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {object[]} [params.answersGiven] Previously given answers.
   */
  reset(params = {}) {
    params = Util.extend({ answersGiven: [] }, params);

    this.currentPanelIndex = params.answersGiven.length;

    this.progressBar.setProgress(this.currentPanelIndex + 1);

    this.panels.forEach((panel, index) => {
      const answer = params.answersGiven
        .find((answer) => answer.question === index);
      const optionsChosen = (answer ?? {}).options;

      panel.reset({
        optionsChosen: optionsChosen,
        completed: index < this.currentPanelIndex
      });
      panel.hide();
    });

    this.updateNavigationButtons();
  }

  /**
   * Handle navigation button clicked.
   * @param {string} buttonId Id of button that was clicked.
   */
  handleNavigationButtonClicked(buttonId) {
    if (buttonId === 'previous') {
      this.moveToPanel(this.currentPanelIndex - 1);
    }
    else if (buttonId === 'next') {
      this.moveToPanel(this.currentPanelIndex + 1);
    }
  }

  /**
   * Update navigation buttons.
   */
  updateNavigationButtons() {
    if (!this.navigationBar) {
      return;
    }

    const panelsAnsweredState = this.panels.map((panel) => panel.getAnswerGiven());
    const maxPanelAnsweredIndex = panelsAnsweredState.indexOf(false) === -1 ?
      panelsAnsweredState.length :
      panelsAnsweredState.indexOf(false);

      this.navigationBar.toggleButtonEnabled('previous', this.currentPanelIndex !== 0);
      this.navigationBar.toggleButtonEnabled('next', this.currentPanelIndex < maxPanelAnsweredIndex);
  }

  /**
   * Move to panel.
   * @param {number} panelIndex Index of panel to move to.
   */
  moveToPanel(panelIndex) {
    if (panelIndex < 0) {
      return;
    }

    if (
      this.params.appearance === 'chat'
      && panelIndex <= this.currentPanelIndex
    ) {
      return;
    }

    if (panelIndex >= this.panels.length) {
      this.callbacks.onCompleted();
    }
    else {
      this.currentPanelIndex = panelIndex;
      this.progressBar.setProgress(panelIndex + 1);
      this.updateNavigationButtons();

      if (this.params.appearance === 'classic') {
        this.panels.forEach((panel, index) => {
          if (index !== panelIndex) {
            panel.hide();
          }
        });
      }

      this.panels[panelIndex].show({ focus: true });
    }
  }

  /**
   * Handle panel completed.
   * @param {number} panelIndex Index of panel that was completed.
   */
  handlePanelCompleted(panelIndex) {
    if (this.params.appearance === 'chat') {
      this.moveToPanel(panelIndex + 1);
    }
  }

  /**
   * Get state of chosen items in each panel.
   * @returns {object[]} State of chosen items in each panel.
   */
  getChoices() {
    return this.panels.map((panel) => panel.getChoices());
  }
}
