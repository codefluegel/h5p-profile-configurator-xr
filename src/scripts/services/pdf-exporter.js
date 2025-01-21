import Util from '@services/util.js';
import { jsPDF } from 'jspdf';

/** @constant {number} PAGE_WIDTH_MM Page width in mm. */
const PAGE_WIDTH_MM = 210; // 210 is DinA4 width in mm

/** @constant {number} PAGE_HEIGHT_MM Page height in mm. */
const PAGE_HEIGHT_MM = 297; // 297 is DinA4 height in mm

/** @constant {number} PAGE_MARGIN_DEFAULT Page margin in mm. */
const PAGE_MARGIN_DEFAULT_MM = 10;

/** @constant {number} GAP_DEFAULT_MM Gap between elements in mm. */
const GAP_DEFAULT_MM = 2;

/** @constant {number} LINE_HEIGHT_FACTOR_DEFAULT Default line height factor. */
const LINE_HEIGHT_FACTOR_DEFAULT = 1.5;

/** @constant {string} FONT_NAME_DEFAULT Default font name. */
const FONT_NAME_DEFAULT = 'helvetica';

/** @constant {number} FONT_SIZE_DEFAULT_PX Default font size in px. */
const FONT_SIZE_DEFAULT_PX = 12;

/** @constant {string} FONT_STYLE_DEFAULT Default font style. */
const FONT_STYLE_DEFAULT = 'normal';

/** @constant {number} PX_PER_MM Pixel per mm. */
const PX_PER_MM = 2.8346456693;

/** @constant {number[]} PAGE_MARGINs_MM Page margins in mm. */
const PAGE_MARGINs_MM = {
  top: PAGE_MARGIN_DEFAULT_MM,
  right: PAGE_MARGIN_DEFAULT_MM,
  bottom: PAGE_MARGIN_DEFAULT_MM,
  left: PAGE_MARGIN_DEFAULT_MM
};

/** @constant {number} CONTENT_WIDTH_MM Content width in mm. */
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGINs_MM.left - PAGE_MARGINs_MM.right;

/** @constant {number} CONTENT_HEIGHT_MM Content height in mm. */
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_MARGINs_MM.top - PAGE_MARGINs_MM.bottom;

const EXPORT_FILENAME_SLUG = 'ProfileConfiguratorResults';

export default class Export {

  /**
   * @class
   */
  constructor() {
    this.pdf = new jsPDF();

    this.setFontSize(FONT_SIZE_DEFAULT_PX);
    this.lineHeightFactor = LINE_HEIGHT_FACTOR_DEFAULT;
    this.currentY = PAGE_MARGINs_MM.top;
  }

  /**
   * Export PDF.
   * @param {object} [params] Parameters.
   * @param {Array} [params.elements] Elements to export.
   * @param {string} params.filename Filename for export.
   * @param {AbortSignal} [abortSignal] Abort signal.
   */
  export(params = {}, abortSignal) {
    params = Util.extend({
      filename: Date.now().toString(),
      elements : []
    }, params);

    if (!Array.isArray(params.elements)) {
      params.elements = [params.elements];
    }

    if (abortSignal?.aborted) {
      return;
    }

    abortSignal?.addEventListener('abort', () => {
      return;
    });

    params.elements.forEach((element) => {
      if (typeof element?.content === 'string') {
        this.addText(element.content, element.params);
      }
      else if (element?.content instanceof Image) {
        this.addImage(element.content);
      }
    });

    this.pdf.save(`${EXPORT_FILENAME_SLUG}-${params.filename}.pdf`);
  }

  /**
   * Get available height on page.
   * @returns {number} Available height in mm.
   */
  getAvailableHeight() {
    return CONTENT_HEIGHT_MM - this.currentY;
  }

  /**
   * Add page to PDF.
   */
  addPage() {
    this.pdf.addPage();
    this.currentY = PAGE_MARGINs_MM.top;
  }

  /**
   * Add a line of text to PDF.
   * @param {string} text Text to add.
   * @param {object} [params] Optional parameters.
   * @param {string} [params.font] Font name.
   * @param {number} [params.size] Font size in px.
   * @param {string} [params.style] Font style ('normal'|'bold'|'italic'|'bolditalic')
   */
  addLine(text, params = {}) {
    params = Util.extend({
      font: FONT_NAME_DEFAULT,
      size: FONT_SIZE_DEFAULT_PX,
      style: FONT_STYLE_DEFAULT
    }, params);

    this.setFontSize(params.size);
    this.pdf.setFont(params.font, params.style);

    if (this.getAvailableHeight() < this.fontSizeMM) {
      this.addPage();
    }

    this.pdf.text(text, PAGE_MARGINs_MM.left, this.currentY + this.fontSizeMM);
    this.currentY += this.lineHeightFactor * this.fontSizeMM;
  }

  /**
   * Set font size.
   * @param {number} px Font size in px.
   */
  setFontSize(px) {
    if (typeof px !== 'number' || px <= 0) {
      return;
    }

    this.fontSizePx = px;
    this.fontSizeMM = Math.min(this.fontSizePx / PX_PER_MM, CONTENT_HEIGHT_MM);
    this.pdf.setFontSize(this.fontSizePx);
  }

  /**
   * Add text to PDF. Will be split into multiple lines if necessary.
   * @param {string} text Text to add.
   * @param {object} [params] Optional parameters.
   * @param {string} [params.font] Font name.
   * @param {number} [params.size] Font size in px.
   * @param {string} [params.style] Font style ('normal'|'bold'|'italic'|'bolditalic')
   */
  addText(text, params = {}) {
    params = Util.extend({
      font: FONT_NAME_DEFAULT,
      size: FONT_SIZE_DEFAULT_PX,
      style: FONT_STYLE_DEFAULT
    }, params);

    this.setFontSize(params.size);
    this.pdf.setFont(params.font, params.style);

    this.pdf
      .splitTextToSize(text, CONTENT_WIDTH_MM)
      .forEach((line) => {
        this.addLine(line, params);
      });

    this.currentY += GAP_DEFAULT_MM;
  }

  /**
   * Get scaled image size that fits into page.
   * @param {Image} image Image to scale.
   * @returns {object} Scaled image size.
   */
  getScaledImageSize(image) {
    const imageSize = this.pdf.getImageProperties(image);

    if (imageSize.height === 1 && imageSize.width === 1) {
      return null; // Empty image, e.g. no content set
    }

    if (imageSize.width <= CONTENT_WIDTH_MM && imageSize.height <= CONTENT_HEIGHT_MM) {
      return imageSize;
    }

    const imageRatio = imageSize.width / imageSize.height;

    // Ensure image fits into page width
    const scaledToFit = {
      width: CONTENT_WIDTH_MM,
      height: CONTENT_WIDTH_MM / imageRatio
    };

    // Ensure image fits into page height
    if (scaledToFit.height > CONTENT_HEIGHT_MM) {
      scaledToFit = {
        width: CONTENT_HEIGHT_MM * imageRatio,
        height: CONTENT_HEIGHT_MM
      };
    }

    return scaledToFit;
  }

  /**
   * Add image to PDF.
   * @param {Image} image Image to add.
   */
  addImage(image) {
    const imageSize = this.getScaledImageSize(image);

    if (!imageSize) {
      return;
    }

    if (this.getAvailableHeight() < imageSize.height) {
      this.addPage();
    }

    this.pdf.addImage(
      image,
      'PNG',
      PAGE_MARGINs_MM.left,
      this.currentY,
      imageSize.width,
      imageSize.height
    );

    this.currentY += imageSize.height + GAP_DEFAULT_MM;
  }
}
