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
   * @param {function} [callbacks.onCompleted] Callback when all is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      questions: [{}]
    }, params);

    this.callbacks = Util.extend({
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
    this.dom.classList.add('h5p-profile-configurator-question-screen');

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
        visualization: question.visualization,
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
        onCompleted: () => {
          this.handlePanelCompleted(questionIndex);
        }
      });

      panel.hide();

      return panel;
    });

    this.panelWrapper = document.createElement('div');
    this.panelWrapper.classList.add('h5p-profile-configurator-panel-wrapper');
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
   * @param {object} [params] Parameters.
   * @param {boolean} [params.focus] If true, set focus to relevant panel.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');

    if (params.focus) {
      this.panels[this.currentPanelIndex]?.focus();
    }
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
   * @param {number} [params.panelIndex] Previously viewed panel index.
   * @param {boolean[]} [params.panelsCompleted] Panels completed.
   */
  reset(params = {}) {
    params = Util.extend({
      answersGiven: [],
      panelIndex: 0,
      panelsCompleted: []
    }, params);

    this.panels.forEach((panel, index) => {
      panel.hide();
      panel.reset();
    });

    params.answersGiven.forEach((answer) => {
      this.panels[answer.question].reset({
        optionsChosen: answer.options
      });
    });

    params.panelsCompleted.forEach((completedState, index) => {
      this.panels[index].setCompleted(completedState);
    });

    this.currentPanelIndex = params.panelIndex ?? params.answersGiven.length;

    this.moveToPanel(this.currentPanelIndex);
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

    if (this.params.appearance === 'chat') {
      if (panelIndex < this.currentPanelIndex) {
        return;
      }

      for (let i = 0; i < panelIndex; i++) {
        this.panels[i].show({
          focus: false,
          showInstantly: true
        });

        this.panels[i].setCompleted(true);
      }
    }

    if (panelIndex >= this.panels.length) {
      this.currentPanelIndex = this.panels.length; // Treating end screen as a panel
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
      this.params.globals.get('triggerXAPIEvent')('progressed');
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

  /**
   * Get panels completed.
   * @returns {boolean[]} Panels completed.
   */
  getPanelsCompleted() {
    return this.panels.map((panel) => panel.isCompleted());
  }

  /**
   * Get current panel index.
   * @returns {number} Current panel index.
   */
  getCurrentPanelIndex() {
    return this.currentPanelIndex;
  }
}
