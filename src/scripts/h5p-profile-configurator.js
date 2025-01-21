import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Screenreader from '@services/screenreader.js';
import Content from '@components/content.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import Sanitization from '@mixins/sanitization.js';
import XAPI from '@mixins/xapi.js';
import Color from 'color';
import '@styles/h5p-profile-configurator.scss';

/** @constant {number} HOVER_COLOR_LIGHTNESS_DELTA Factor to lighten/darken a hover color. */
const HOVER_COLOR_LIGHTNESS_DELTA = 0.25;

/** @constant {number} ACTIVE_COLOR_LIGHTNESS_DELTA Factor to lighten/darken an active color. */
const ACTIVE_COLOR_LIGHTNESS_DELTA = 0.37;

/** @constant {number} PALE_COLOR_FACTOR Factor to mix a color with white. */
const PALE_COLOR_FACTOR = 0.9;

/** @constant {string} DEFAULT_DESCRIPTION description */
const DEFAULT_DESCRIPTION = 'ProfileConfigurator';

export default class ProfileConfigurator extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(
      ProfileConfigurator, [QuestionTypeContract, Sanitization, XAPI]
    );

    // Sanitize parameters
    this.params = Util.extend({
      titleScreen: {
        title: {}
      },
      questionsGroup: {
        questions: []
      },
      personalitiesGroup: {
        personalities: []
      },
      resultScreen: {
        exportTitle: 'Profile configurator results',
      },
      visual: {
        isAnimationOn: true,
        showProgressBar: true,
        appearance: 'classic',
        colorButton: '#1a73d9',
        colorProgressBar: '#1a73d9'
      },
      l10n: {
        noQuestions: 'It seems that there is no valid question set. Try checking for valid personality names.',
        // eslint-disable-next-line max-len
        noPersonalities: 'It seems that there are not enough valid personalities set. Try checking for missing names or duplicate names.',
        start: 'Start',
        done: 'Proceed',
        currentOfTotal: '@current of @total',
        skip: 'Skip',
        reset: 'Restart',
        download: 'Download',
        review: 'Review answers',
        notFinished: 'The quiz was not finished yet.',
        yourChoices: 'Your choices',
      },
      a11y: {
        titleScreenWasOpened: 'The title screen was opened.',
        wheelStarted: 'The wheel of fortune started spinning. Please wait a moment.',
        progressBar: 'Progress bar',
        resultsTitle: 'Here are your results.',
        standby: 'Stand by.',
        previous: 'Previous question',
        next: 'Next question'
      },
      behaviour: {
        allowReview: false,
        delegateResults: false // Used for external override
      }
    }, params);

    // Override result screen animation if required
    if (!this.params.visual.isAnimationOn) {
      this.params.resultScreen.animation = 'none';
    }

    this.sanitizeParameters();

    this.contentId = contentId;
    this.extras = extras;

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    // Globals
    this.globals = new Globals();
    this.globals.set('contentId', this.contentId);
    this.globals.set('mainInstance', this);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });
    this.globals.set('read', (text) => {
      Screenreader.read(text);
    });
    this.globals.set('triggerXAPIEvent', (verb) => {
      return this.triggerXAPIEvent(verb);
    });

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    this.setupColorScheme();
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-profile-configurator');
    $wrapper.get(0).appendChild(this.dom);
  }

  /**
   * Run content.
   * Can be uset to puppeteer content with the parameter
   * `params.behaviour.delegateResults=true` that will hand over control to the
   *  parent content.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.focus] If true. set focus.
   */
  run(params) {
    this.content.run(params);
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-profile-configurator-main');

    this.content = new Content(
      {
        dictionary: this.dictionary,
        globals: this.globals,
        appearance: this.params.visual.appearance,
        previousState: this.previousState,
        personalities: this.params.personalities,
        questions: this.params.questions,
        colorProgressBar: this.params.visual.colorProgressBar,
        isAnimationOn: this.params.visual.isAnimationOn,
        showProgressBar: this.params.visual.showProgressBar,
        resultScreen: this.params.resultScreen,
        delegateResults: this.params.behaviour.delegateResults,
        delegateRun: this.params.behaviour.delegateRun,
        allowReview: this.params.behaviour.allowReview && this.params.visual.appearance === 'classic',
        ...(this.params.showTitleScreen &&
          {
            titleScreen: {
              titleScreenIntroduction:
                this.params.titleScreen.titleScreenIntroduction,
              titleScreenMedium:
                this.params.titleScreen.titleScreenMedium,
              maxHeight:
                this.params.titleScreen.maxHeight
            }
          }
        )
      },
      {
        onReset: () => {
          this.resetTask({ focus: true });
        }
      }
    );

    this.on('resize', () => {
      this.content.resize();
    });

    dom.append(this.content.getDOM());

    return dom;
  }

  /**
   * Get number of questions.
   * Could be computed using params, but would duplicate sanitizing.
   * @returns {number} Number of questions.
   */
  getNumberOfQuestions() {
    return this.params.questions.length ?? 0;
  }

  /**
   * Setup color scheme.
   */
  setupColorScheme() {
    const colorBase = Color(this.params.visual.colorButton);
    const colorText = (colorBase.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorHover = (colorBase.isDark()) ?
      colorBase.darken(HOVER_COLOR_LIGHTNESS_DELTA) :
      colorBase.lighten(HOVER_COLOR_LIGHTNESS_DELTA);

    const colorActive = (colorBase.isDark()) ?
      colorBase.darken(ACTIVE_COLOR_LIGHTNESS_DELTA) :
      colorBase.lighten(ACTIVE_COLOR_LIGHTNESS_DELTA);

    const colorActiveHover = (colorActive.isDark()) ?
      colorActive.darken(HOVER_COLOR_LIGHTNESS_DELTA) :
      colorActive.lighten(HOVER_COLOR_LIGHTNESS_DELTA);

    const colorTextActive = (colorActive.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorPale = colorBase.mix(Color('#ffffff'), PALE_COLOR_FACTOR);

    this.dom.style.setProperty('--color-button-background', colorBase.hex());
    this.dom.style.setProperty('--color-button-text', colorText);
    this.dom.style.setProperty('--color-button-hover', colorHover);
    this.dom.style.setProperty('--color-button-active', colorActive);
    this.dom.style.setProperty('--color-button-active-hover', colorActiveHover);
    this.dom.style.setProperty('--color-button-text-active', colorTextActive);
    this.dom.style.setProperty('--color-button-pale', colorPale);
  }

  /**
   * Get current position.
   * @returns {number} Current position.
   */
  getCurrentPosition() {
    return this.content?.getCurrentPosition();
  }

  /**
   * Get current state.
   * @returns {object|undefined} Current state.
   */
  getCurrentState() {
    if (!this.getAnswerGiven()) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    return this.content?.getCurrentState();
  }

  /**
   * Get context data.
   * Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    const position = (this.content) ?
      this.content?.getCurrentPosition() + 1 :
      (this.previousState?.answersGiven?.length + 1) || 1;

    return {
      type: 'question',
      value: position
    };
  }

  /**
   * Get results for content.
   * @returns {object} Results.
   */
  getResults() {
    return {
      title: this.extras.metadata.title,
      ...this.content?.getResults()
    };
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return DEFAULT_DESCRIPTION;
  }
}
