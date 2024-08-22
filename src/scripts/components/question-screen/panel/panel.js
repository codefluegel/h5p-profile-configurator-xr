import Util from '@services/util.js';
import Option from './option.js';
import './panel.scss';

/** @constant {number} NUMBER_OF_DOTS Number of dots in bubble. */
const NUMBER_OF_DOTS = 3;

/** @constant {number} FOCUS_TIMEOUT_MS Timeout for focussing. */
const FOCUS_TIMEOUT_MS = 50;

export default class Panel {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.appearance] Appearence, 'classic', 'chat'.
   * @param {string} [params.questionText] Question text.
   * @param {boolean} [params.animation] If true, animate option buttons.
   * @param {object} [params.answerOptions] Answer options.
   * @param {object} [params.image] Image data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Callback when panel is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      appearance: 'classic',
      questionText: '',
      answerOptions: []
    }, params);

    this.params.questionText = Util.purifyHTML(this.params.questionText);

    this.callbacks = Util.extend({
      onOptionChosen: () => {},
      onCompleted: () => {}
    }, callbacks);

    this.isVisibleState = true;

    this.optionsChosen = [];

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-xr-panel');
    this.dom.classList.add(`appearance-${this.params.appearance}`);

    // Image
    if (this.params.image?.file?.path) {
      const image = document.createElement('img');
      image.classList.add('h5p-personality-quiz-xr-panel-image');
      image.setAttribute('alt', this.params.image.file.alt ?? '');
      image.addEventListener('load', () => {
        this.params.globals.get('resize')();
      });
      H5P.setSource(
        image, this.params.image.file, this.params.globals.get('contentId')
      );
      this.dom.append(image);
    }

    // Question text
    const questionTextId = H5P.createUUID();

    this.questionText = document.createElement('div');
    this.questionText.classList.add('h5p-personality-quiz-xr-question');
    this.questionText.setAttribute('id', questionTextId);
    this.dom.append(this.questionText);

    if (this.params.animation && this.params.appearance === 'chat') {
      this.typingDots = document.createElement('div');
      this.typingDots.classList.add('typing-animation-dots');
      this.questionText.append(this.typingDots);

      for (let i = 0; i < NUMBER_OF_DOTS; i++) {
        const typingDot = document.createElement('div');
        typingDot.classList.add('typing-animation-dot');
        this.typingDots.append(typingDot);
      }
    }
    else {
      this.questionText.innerText = this.params.questionText;
    }

    const mode = (this.params.answerOptions.every((option) => {
      return option?.image?.file;
    })) ?
      'image' :
      'text';

    // Options
    this.optionWrapper = document.createElement('ol');
    this.optionWrapper.classList.add('h5p-personality-quiz-xr-answer-options');
    this.optionWrapper.classList.add(`mode-${mode}`);
    this.optionWrapper.setAttribute('aria-labelledby', questionTextId);
    // Some screenreaders do not real label unless role is set to group
    this.optionWrapper.setAttribute('role', 'group');
    if (this.params.animation && this.params.appearance === 'chat') {
      this.optionWrapper.classList.add('display-none');
    }

    this.dom.append(this.optionWrapper);

    this.options = [];

    this.params.answerOptions.forEach((option, index) => {
      const listItem = document.createElement('li');
      listItem.classList.add('h5p-personality-quiz-xr-answer-list-item');
      this.optionWrapper.append(listItem);

      const optionInstance = new Option(
        {
          globals: this.params.globals,
          appearance: this.params.appearance,
          mode: mode,
          text: option.text,
          image: option.image,
          animation: this.params.animation
        },
        {
          onClicked: () => {
            this.handleOptionChosen(index);
          },
          onCompleted: () => {
            this.handleOptionCompleted();
          }
        }
      );

      this.options.push(optionInstance);

      listItem.append(optionInstance.getDOM());
    });

    if (this.params.allowsMultipleChoices && this.params.appearance === 'chat') {
      this.buttonDone = document.createElement('button');
      this.buttonDone.classList.add('h5p-personality-quiz-xr-button-done');
      if (this.params.animation && this.params.appearance === 'chat') {
        this.buttonDone.classList.add('display-none');
      }

      const label = document.createElement('span');
      label.classList.add('h5p-personality-quiz-xr-button-done-label');
      label.innerText = this.params.dictionary.get('l10n.done');
      this.buttonDone.append(label);

      if (this.optionsChosen.length === 0) {
        this.buttonDone.disabled = true;
      }

      this.buttonDone.addEventListener('click', () => {
        this.buttonDone.disabled = true;
        this.options.forEach((option) => {
          option.disable();
        });

        this.handleOptionCompleted(true);
      });

      this.dom.append(this.buttonDone);
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.showInstantly] If true, skip animation.
   * @param {boolean} [params.focus] If true, set focus.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');
    this.isVisibleState = true;

    if (
      !params.showInstantly && this.params.appearance === 'chat'
    ) {
      const delayTypingAnimation = Math.min(
        this.params.questionText.length * Panel.DELAY_PER_CHAR_MS,
        Panel.MAX_DELAY_TYPING_ANIMATION_MS
      );

      this.params.globals.get('resize')();

      window.setTimeout(() => {
        this.questionText.innerText = this.params.questionText;

        window.setTimeout(() => {
          this.optionWrapper.classList.remove('display-none');
          this.buttonDone?.classList.remove('display-none');
          this.params.globals.get('resize')();
          if (params.focus) {
            window.setTimeout(() => {
              this.focus();
            }, FOCUS_TIMEOUT_MS); // Prevent jumping if focus called before resize
          }

        }, Panel.DELAY_FOR_ANSWER_OPTIONS_MS);
      }, delayTypingAnimation);
    }
    else {
      this.questionText.innerText = this.params.questionText;
      this.optionWrapper.classList.remove('display-none');
      if (params.focus) {
        window.requestAnimationFrame(() => {
          this.focus();
        }); // Ensure option is visible
      }

      window.requestAnimationFrame(() => {
        this.params.globals.get('resize')();
      });
    }

    if (this.params.allowsMultipleChoices && this.params.appearance === 'chat') {
      this.buttonDone.disabled = this.optionsChosen.length === 0;
    }
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.isVisibleState = false;

    this.options.forEach((option) => {
      option.toggleAnimation(false);
    });
  }

  /**
   * Focus.
   * @param {object} [params] Parameters.
   */
  focus(params) {
    const firstAvailableOption = this.options.find((option) => {
      return !option.isDisabled();
    });
    firstAvailableOption?.focus(params);
  }

  /**
   * Determine whether panel is visible.
   * @returns {boolean} True, if panel is visible, else false.
   */
  isVisible() {
    return this.isVisibleState;
  }

  /**
   * Set completed state.
   * @param {boolean} state State.
   */
  setCompleted(state) {
    if (this.params.appearance !== 'chat') {
      return;
    }

    this.isCompletedState = state;

    if (state) {
      this.options.forEach((option) => {
        option.disable();
      });
    }

    if (this.buttonDone) {
      this.buttonDone.disabled = state;
      this.buttonDone.classList.toggle('selected', state);
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {number[]} [params.optionsChosen] Index of previously chosen options.
   */
  reset(params = {}) {
    this.setCompleted(false);

    if (this.params.animation && this.params.appearance === 'chat') {
      this.questionText.innerHTML = '';
      this.questionText.append(this.typingDots);
      this.optionWrapper.classList.add('display-none');
    }

    this.optionsChosen = params.optionsChosen ?? [];

    this.options.forEach((option, index) => {
      const selected = this.optionsChosen.includes(index);
      option.reset({
        disabled: this.params.allowsMultipleChoices ? false : selected,
        selected: selected
      });
    });

    if (this.params.animation && this.params.appearance === 'chat') {
      this.buttonDone?.classList.add('display-none');
    }
  }

  /**
   * Handle option chosen.
   * @param {number} indexChosen Index of option that was chosen.
   */
  handleOptionChosen(indexChosen) {
    this.options.forEach((option, index) => {
      if (!this.params.allowsMultipleChoices) {
        if (index === indexChosen) {
          option.disable();
        }
        else {
          option.deselect();
          option.enable();
        }
      }
    });

    this.optionsChosen = this.options.reduce((acc, option, index) => {
      return option.isSelected() ? [...acc, index] : acc;
    }, []);

    this.callbacks.onOptionChosen();

    if (this.params.allowsMultipleChoices && this.params.appearance === 'chat') {
      this.buttonDone.disabled = this.optionsChosen.length === 0;
    }
  }

  /**
   * Determine whether an answer was given.
   * @returns {boolean} True, if answer was given, else false.
   */
  getAnswerGiven() {
    return this.optionsChosen.length > 0;
  }

  /**
   * Handle option completed.
   * @param {boolean} [override] If true, always process.
   */
  handleOptionCompleted(override = false) {
    if (override) {
      this.setCompleted(true);
    }

    if (!override && this.params.allowsMultipleChoices && this.params.appearance === 'chat') {
      return;
    }
    this.callbacks.onCompleted();
  }

  /**
   * Determine whether panel was completed.
   * @returns {boolean} True, if panel was completed, else false.
   */
  isCompleted() {
    return this.isCompletedState;
  }

  getChoices() {
    return ({
      question: this.params.questionText,
      options: this.options.map((option, index) => {
        return {
          text: option.params.text,
          image: option.params.image,
          selected: option.isSelected()
        };
      })
    });
  }
}

/** @constant {number} DELAY_PER_CHAR_MS Time to delay showing the question per character. */
Panel.DELAY_PER_CHAR_MS = 40;

/** @constant {number} MAX_DELAY_TYPING_ANIMATION_MS Maximum time to delay showing the question. */
Panel.MAX_DELAY_TYPING_ANIMATION_MS = 2500;

/** @constant {number} DELAY_FOR_ANSWER_OPTIONS_S Time to delay showing the answer options. */
Panel.DELAY_FOR_ANSWER_OPTIONS_MS = 1000;
