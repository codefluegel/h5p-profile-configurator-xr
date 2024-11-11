import Util from '@services/util.js';
import './result-screen.scss';

export default class ResultScreen {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.l10n] Localization.
   * @param {object} [params.a11y] Accessibility.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onReset] Callback when reset button clicked.
   * @param {function} [callbacks.onBack] Callback when back button clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      l10n: {
        notFinished: 'The quiz was not yet finished',
        reset: 'Retake the quiz'
      },
      a11y: {
        resultsTitle: 'Here are your results.',
      }
    }, params);

    this.callbacks = Util.extend({
      onReset: () => {},
      onBack: () => {}
    }, callbacks);

    this.ariaText = '';
    this.resultPersonality = this.params.l10n.notFinished;
    this.showOptionsChosen = params.displayOptionsChosen || false;

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-profile-configurator-result-screen');

    this.title = document.createElement('p');
    this.title.classList.add(
      'h5p-profile-configurator-result-screen-explanation-title'
    );
    this.title.classList.add('display-none');
    this.dom.append(this.title);

    const row = document.createElement('div');
    row.classList.add('h5p-profile-configurator-result-screen-row');

    // Visualization
    this.visualizationWrapper = document.createElement('div');
    this.visualizationWrapper.classList.add('h5p-profile-configurator-visualization');
    this.visualizationWrapper.classList.add('display-none');
    row.append(this.visualizationWrapper);

    this.detailsDOM = document.createElement('div');
    this.detailsDOM.classList.add('h5p-profile-configurator-result-screen-details');
    row.append(this.detailsDOM);

    // Personality explanation
    this.explanation = document.createElement('div');
    this.explanation.classList.add(
      'h5p-profile-configurator-result-screen-explanation'
    );
    this.explanation.classList.add('display-none');

    this.description = document.createElement('p');
    this.description.classList.add(
      'h5p-profile-configurator-result-screen-explanation-description'
    );
    this.explanation.append(this.description);
    this.detailsDOM.append(this.explanation);

    // Options chosen
    this.optionsChosen = document.createElement('div');
    this.optionsChosen.classList.add(
      'h5p-profile-configurator-result-screen-options-chosen'
    );
    this.optionsChosen.classList.add('display-none');
    this.detailsDOM.append(this.optionsChosen);

    this.choicesTitle = document.createElement('p');
    this.choicesTitle.classList.add('h5p-profile-configurator-result-screen-choices-title');
    this.choicesTitle.innerText = this.params.dictionary.get('l10n.yourChoices');
    this.optionsChosen.append(this.choicesTitle);

    this.choices = document.createElement('ul');
    this.choices.classList.add('h5p-profile-configurator-result-screen-choices');
    this.optionsChosen.append(this.choices);

    this.dom.append(row);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('h5p-profile-configurator-result-screen-buttons');

    if (this.params.allowReview) {
      this.buttonBack = document.createElement('button');
      this.buttonBack.classList.add('h5p-profile-configurator-result-screen-button');
      this.buttonBack.innerText = this.params.l10n.review;
      this.buttonBack.addEventListener('click', () => {
        this.callbacks.onBack();
      });
      buttonWrapper.append(this.buttonBack);
    }

    this.buttonReset = document.createElement('button');
    this.buttonReset.classList.add('h5p-profile-configurator-result-screen-button');
    this.buttonReset.innerText = this.params.l10n.reset;
    this.buttonReset.addEventListener('click', () => {
      this.callbacks.onReset();
    });
    buttonWrapper.append(this.buttonReset);

    this.dom.append(buttonWrapper);
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
   * @param {boolean} [params.fade] If true, will fade in.
   */
  show(params = {}) {
    this.params.globals.get('read')(this.ariaText || '');

    if (!params.fade) {
      this.dom.classList.remove('display-none');
      return;
    }

    this.dom.classList.add('fade-in');
    this.dom.classList.remove('display-none');

    window.setTimeout(() => {
      this.dom.classList.remove('fade-in');
    }, 0);
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    this.resultPersonality = this.params.l10n.notFinished;
  }

  /**
   * Focus.
   */
  focus() {
    this.buttonReset.focus();
  }

  /**
   * Set content.
   * @param {object} params Parameters.
   * @param {object} params.personality Personality description.
   * @param {string} params.personality.name Personality name.
   * @param {string} [params.personality.description] Personality description.
   * @param {string} [params.personality.imagePosition] Position 'background' or 'inline'.
   * @param {string} [params.personality.image] Image data.
   */
  setContent(params = {}) {
    params = Util.extend({
      choices: [],
      personality: {}
    }, params);

    this.choices.innerHTML = '';

    params.choices
      .map((choice) => {
        const choiceItem = document.createElement('li');
        choiceItem.classList.add(
          'h5p-profile-configurator-result-screen-choices-list-item'
        );

        const questionDOM = document.createElement('p');
        questionDOM.classList.add(
          'h5p-profile-configurator-result-screen-choices-question'
        );
        questionDOM.innerText = choice.question;

        const options = choice.options.map((option) => {
          const text = Util.purifyHTML(option.text);
          return (option.selected ? `<strong>${text}</strong>` : text);
        });

        const choicesDOM = document.createElement('p');
        choicesDOM.classList.add(
          'h5p-profile-configurator-result-screen-choices-options'
        );
        choicesDOM.innerHTML = options.join(', ');

        choiceItem.append(questionDOM);
        choiceItem.append(choicesDOM);
        return choiceItem;
      })
      .forEach((choiceItem) => {
        this.choices.append(choiceItem);
      });

    params.personality.name = Util.purifyHTML(params.personality.name);

    this.ariaText = `${this.params.a11y.resultsTitle} ${params.name}`;
    this.resultPersonality = params.personality.name;
    this.resultDescription = params.personality.description;

    if (params.personality.description && this.params.displayDescription) {
      this.ariaText =
        `${this.ariaText}. ${Util.purifyHTML(params.personality.description)}`;
    }

    // Author doesn't want any explanation beyond image
    if (!this.params.displayTitle && !this.params.displayDescription) {
      this.explanation.classList.add('display-none');
    }

    // Title
    if (params.personality.name && this.params.displayTitle) {
      this.explanation.classList.remove('display-none');
      this.title.classList.remove('display-none');
      this.title.innerText = params.personality.name;
    }
    else {
      this.title.classList.add('display-none');
    }

    this.visualizationWrapper.innerHTML = '';

    if (Object.keys(params.personality.visualization?.content?.params ?? {}).length) {
      const instance = H5P.newRunnable(
        params.personality.visualization.content,
        this.params.globals.get('contentId'),
        undefined,
        true
      );

      if (instance) {
        // Resize parent when children resize
        this.bubbleUp(
          instance, 'resize', this.params.globals.get('mainInstance')
        );

        // Resize children to fit inside parent
        this.bubbleDown(
          this.params.globals.get('mainInstance'), 'resize', [instance]
        );

        this.visualizationWrapper.style.setProperty(
          '--max-visualization-height',
          params.personality.visualization.maxHeight ?? 'none'
        );

        if (instance.libraryInfo.machineName === 'H5P.Image') {
          instance.on('loaded', () => {
            this.params.globals.get('resize')();
          });
        };

        instance.attach(H5P.jQuery(this.visualizationWrapper));

        // Override model-viewer settings
        if (instance.libraryInfo.machineName === 'H5P.ModelViewer') {
          const modelViewer = this.visualizationWrapper.querySelector('model-viewer');
          if (modelViewer) {
            modelViewer.parentNode.style.height = '';
            modelViewer.style.height = 'inherit';
            modelViewer.style.width = 'inherit';
            modelViewer.addEventListener('load', () => {
              const { x, y } = modelViewer?.getDimensions();
              if (typeof x === 'number' && typeof y === 'number') {
                modelViewer.style.aspectRatio = `${x}/${y}`;
              }

              this.visualizationWrapper.querySelector('.fullscreenButton')?.remove();
              this.params.globals.get('resize')();
            });
          }
        }
      }

      // Only images can be shown as background
      if (this.params.imagePosition === 'background' && instance.libraryInfo.machineName === 'H5P.Image') {
        const src = instance.source;
        this.dom.style.backgroundImage = `url(${src})`;
      }

      this.visualizationWrapper.classList.toggle(
        'display-none',
        !instance ||
        this.params.imagePosition === 'background' && instance.libraryInfo.machineName === 'H5P.Image'
      );

      // Used in getResults
      this.visualization = params.personality.visualization;
    }

    // Description
    if (params.personality.description && this.params.displayDescription) {
      this.explanation.classList.remove('display-none');
      this.description.innerHTML = params.personality.description;
    }
    else {
      this.explanation.classList.add('display-none');
    }

    if (!params.personality.name && !params.personality.description) {
      this.explanation.classList.add('display-none');
    }

    this.optionsChosen.classList.toggle('display-none', !this.params.displayOptionsChosen);

    if ([...this.detailsDOM.children].every((child) => child.classList.contains('display-none'))) {
      this.detailsDOM.classList.add('display-none');
    }
  }

  /**
   * Get current result state.
   * Required, because the result may be randomly chosen on equal scores.
   * @returns {string|null} Current result state.
   */
  getCurrentState() {
    return (this.resultPersonality !== this.params.l10n.notFinished) ?
      this.resultPersonality :
      null;
  }

  /**
   * Get results for result screen.
   * @returns {object} Results.
   */
  getResults() {
    return {
      personality: this.resultPersonality,
      description: this.resultDescription,
      image: this.visualization
    };
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }
}
