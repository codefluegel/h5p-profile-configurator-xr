import Util from '@services/util.js';
import './navigation-bar.scss';

export default class NavigationBar {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Callback when button is clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      allowBack: true,
      allowNext: true,
      a11y: {
        previous: 'Previous question',
        next: 'Next question'
      }
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {}
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('navigation-bar');
    this.dom.setAttribute('role', 'navigation');

    if (this.params.allowReview) {
      this.buttons.previous = this.buildButton('previous');
      this.dom.append(this.buttons.previous);
    }

    this.buttons.next = this.buildButton('next');
    this.dom.append(this.buttons.next);
    if (!this.params.allowReview) {
      this.dom.classList.add('no-review-allowed');
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
   * Build button.
   * @param {string} id Id of button.
   * @param {function} callback Callback when button is clicked.
   * @returns {HTMLElement} Button.
   */

  buildButton(id) {
    const button = document.createElement('button');
    button.classList.add('nav-button');
    button.classList.add(id);
    button.setAttribute('aria-label', this.params.a11y[id]);

    button.addEventListener('click', () => {
      this.callbacks.onClicked(id);
    });

    return button;
  }


  /**
   * Toggle enabled state of button.
   * @param {string} buttonId Id of button to toggle.
   * @param {boolean} [state] State to set. If not provided, toggle current state.
   */
  toggleButtonEnabled(buttonId, state = null) {
    if (!this.buttons[buttonId]) {
      return;
    }

    const targetState = state ?? !this.buttons[buttonId].disabled;
    this.buttons[buttonId].disabled = !targetState;
  }

  /**
   * Set focus to button.
   * @param {string} buttonId Id of button to focus.
   */
  focusButton(buttonId) {
    if (!this.buttons[buttonId]) {
      return;
    }

    this.buttons[buttonId].focus();
  }
}
