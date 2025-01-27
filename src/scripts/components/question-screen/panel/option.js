import Util from '@services/util.js';
import './option.scss';

export default class Option {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.appearance] Appearance, 'classic', 'chat'.
   * @param {string} [params.mode] Mode 'text' or 'image'.
   * @param {string} [params.text] Text for option.
   * @param {object} [params.image] Image data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Callback when option is chosen.
   * @param {function} [callbacks.onCompleted] Callback on animation ended.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      appearance: 'classic',
      mode: 'text',
      text: '\u3164', // Invisible but has height.
      image: {}
    }, params);

    this.params.text = Util.purifyHTML(this.params.text);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onCompleted: () => {}
    }, callbacks);

    if (this.params.appearance === 'chat') {
      this.params.animation = false;
    }

    this.isSelectedState = false;
    this.isDisabledState = false;

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-profile-configurator-answer-option');
    this.dom.classList.add(`appearance-${this.params.appearance}`);
    if (this.params.mode === 'image') {
      this.dom.classList.add('has-image');
    }

    // Button
    this.button = document.createElement('button');
    this.button.classList.add('h5p-profile-configurator-answer-option-button');

    this.button.addEventListener('click', () => {
      window.setTimeout(() => {
        if (this.isSelected()) {
          this.deselect();
        }
        else {
          this.select({ animate: this.params.animation });
        }

        if (this.params.animation) {
          this.callbacks.onClicked();
        }
        else {
          this.callbacks.onClicked();
          this.callbacks.onCompleted();
        }
      }, 0);
    });

    this.button.addEventListener('animationend', () => {
      this.toggleAnimation(false);
      this.callbacks.onCompleted();
    });

    // Image
    if (this.params.mode === 'image') {
      const image = document.createElement('img');
      image.classList.add('h5p-profile-configurator-answer-option-button-image');
      image.setAttribute('alt', this.params.image.alt ?? '');
      image.addEventListener('load', () => {
        this.params.globals.get('resize')();
      });
      H5P.setSource(
        image, this.params.image.file, this.params.globals.get('contentId')
      );
      this.button.append(image);
    }

    // Button text
    this.buttonText = document.createElement('span');
    this.buttonText.classList.add(
      'h5p-profile-configurator-answer-option-button-text'
    );
    this.buttonText.innerText = this.params.text;
    this.button.append(this.buttonText);

    this.dom.append(this.button);
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
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Focus.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Select.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.animate] If true, animate when being selected.
   */
  select(params = {}) {
    if (params.animate) {
      this.toggleAnimation(true);
    }

    this.button.classList.add('selected');
    this.isSelectedState = true;
  }

  /**
   * Unselect.
   */
  deselect() {
    this.toggleAnimation(false);
    this.button.classList.remove('selected');
    this.isSelectedState = false;
  }

  /**
   * Get selected state.
   * @returns {boolean} True if selected. Else false.
   */
  isSelected() {
    return this.isSelectedState;
  }

  toggleAnimation(state) {
    const targetState = state ?? !this.buttonText.classList.contains('animate');
    this.buttonText.classList.toggle('animate', targetState);
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.selected] If true, set to selected.
   * @param {boolean} [params.disabled] If true, set to disabled.
   */
  reset(params = {}) {
    this.toggleAnimation(false);
    this.button.classList.remove('selected');

    if (params.selected) {
      this.select();
    }
    else {
      this.deselect();
    }

    if (params.disabled) {
      this.disable();
    }
    else {
      this.enable();
    }
  }

  /**
   * Enable.
   */
  enable() {
    this.button.removeAttribute('disabled');
    this.isDisabledState = false;
  }

  /**
   * Disable.
   */
  disable() {
    this.isDisabledState = true;
    this.button.setAttribute('disabled', 'disabled');
  }

  /**
   * Determine whether option is disabled.
   * @returns {boolean} True if disabled. Else false.
   */
  isDisabled() {
    return this.isDisabledState;
  }
}
