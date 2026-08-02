/**
 * Element picker UI for site configuration
 * Provides visual feedback and selector generation
 */

export class Picker {
  private highlightElement: HTMLDivElement | null = null;
  private menuElement: HTMLDivElement | null = null;
  private currentTarget: Element | null = null;
  private isActive = false;

  /**
   * Activates the picker UI
   */
  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createHighlight();
    this.attachListeners();
  }

  /**
   * Deactivates the picker UI
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeHighlight();
    this.removeMenu();
    this.detachListeners();
  }

  /**
   * Creates the highlight overlay element
   */
  private createHighlight(): void {
    this.highlightElement = document.createElement('div');
    this.highlightElement.className = 'md-saver-highlight';
    document.body.appendChild(this.highlightElement);
  }

  /**
   * Removes the highlight element
   */
  private removeHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }

  /**
   * Updates highlight position to match target element
   */
  private updateHighlight(element: Element): void {
    if (!this.highlightElement) return;

    const rect = element.getBoundingClientRect();
    this.highlightElement.style.width = `${rect.width}px`;
    this.highlightElement.style.height = `${rect.height}px`;
    this.highlightElement.style.top = `${rect.top + window.scrollY}px`;
    this.highlightElement.style.left = `${rect.left + window.scrollX}px`;
  }

  /**
   * Shows the action menu at the given position
   */
  private showMenu(element: Element, x: number, y: number): void {
    this.removeMenu();

    this.menuElement = document.createElement('div');
    this.menuElement.className = 'md-saver-menu';
    this.menuElement.style.top = `${y + window.scrollY}px`;
    this.menuElement.style.left = `${x + window.scrollX}px`;

    const buttons = [
      { text: 'Set as Main Frame', action: () => this.setMainFrame(element) },
      { text: 'Ignore Region', action: () => this.ignoreRegion(element) },
      { text: 'Create Template', action: () => this.createTemplate(element) },
      { text: 'Cancel', action: () => this.removeMenu() },
    ];

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.addEventListener('click', btn.action);
      this.menuElement.appendChild(button);
    }

    document.body.appendChild(this.menuElement);
  }

  /**
   * Removes the action menu
   */
  private removeMenu(): void {
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
  }

  /**
   * Handles mouse move events
   */
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as Element;
    if (target === this.highlightElement || target === this.menuElement) return;

    this.currentTarget = target;
    this.updateHighlight(target);
  };

  /**
   * Handles click events
   */
  private onClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.currentTarget) {
      this.showMenu(this.currentTarget, e.clientX, e.clientY);
    }
  };

  /**
   * Attaches event listeners
   */
  private attachListeners(): void {
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('click', this.onClick, true);
  }

  /**
   * Detaches event listeners
   */
  private detachListeners(): void {
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('click', this.onClick, true);
  }

  /**
   * Action: Set element as main frame
   */
  private setMainFrame(element: Element): void {
    const selector = generateSelector(element);
    console.log('Set main frame:', selector);
    // TODO: Save to SiteProfile
    this.removeMenu();
    this.deactivate();
  }

  /**
   * Action: Mark element to be ignored
   */
  private ignoreRegion(element: Element): void {
    const selector = generateSelector(element);
    console.log('Ignore region:', selector);
    // TODO: Save to SiteProfile
    this.removeMenu();
    this.deactivate();
  }

  /**
   * Action: Create custom template
   */
  private createTemplate(element: Element): void {
    const selector = generateSelector(element);
    const template = prompt(
      'Enter Markdown template (use {{content}} for text):',
      '> [!info]\n> {{content}}'
    );

    if (template) {
      console.log('Create template:', selector, template);
      // TODO: Save to SiteProfile
    }

    this.removeMenu();
    this.deactivate();
  }
}

/**
 * Generates a CSS selector for an element
 */
function generateSelector(element: Element): string {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }

  // Try unique class combination
  if (element.className) {
    const classes = Array.from(element.classList)
      .filter((c) => c && !c.startsWith('md-saver-'))
      .join('.');

    if (classes) {
      const selector = `${element.tagName.toLowerCase()}.${classes}`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }

  // Fallback to nth-child path
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;
    path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
    current = parent;
  }

  return path.join(' > ');
}
