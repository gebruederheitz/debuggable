export class DebugVisualizer {
    /** @type Element | null */
    element = null;

    constructor() {
        const container = document.querySelector('#debug-visualize');
        if (!container) {
            return;
        }

        container.style.display = 'block';
        container.style.maxHeight = '50vh';
        container.style.overflowY = 'auto';
        container.style.fontSize = '1.5em';

        this.element = document.createElement('div');
        this.element.classList.add('console');
        this.element.style.width = '100%';
    }

    getPrint(level) {
        return (...args) => {
            if (!this.element) {
                return;
            }

            let string = '';

            args.forEach((arg, i) => {
                if (!arg) {
                    return;
                }

                if (i > 0) {
                    string += ' ';
                }

                if (arg.startsWith && arg.startsWith('%c')) {
                    arg = arg.substring(2);
                }

                if (arg === 'font-weight:bold;') {
                    return;
                }

                if (arg.substring) {
                    string += arg;
                } else {
                    string += JSON.stringify(arg);
                }
            });

            const entry = this._getEntryElement(level, string);

            if (this.element.childElementCount > 0) {
                const insertionPoint = this.element.firstElementChild;
                this.element.insertBefore(entry, insertionPoint);
            } else {
                this.element.appendChild(entry);
            }
        };
    }

    get log() {
        return this.getPrint('log');
    }

    get warn() {
        return this.getPrint('warn');
    }

    get error() {
        return this.getPrint('error');
    }

    _getEntryElement(level, content) {
        let borderColor = '#aaa';
        let textColor = '#222';

        if (level === 'warn') {
            textColor = '#540';
            borderColor = '#870';
        } else if (level === 'error') {
            textColor = '#500';
            borderColor = '#800';
        }

        const entry = document.createElement('CODE');
        entry.innerText = content;
        entry.classList.add('debug-visualize__entry');
        entry.classList.add(`debug-visualize__entry--${level}`);
        entry.style.display = 'block';
        entry.style.marginBottom = '1rem';
        entry.style.padding = '.25rem';
        entry.style.paddingLeft = '.5rem';
        entry.style.backgroundColor = '#ddd';
        entry.style.borderLeft = `10px solid ${borderColor}`;
        entry.style.color = textColor;

        return entry;
    }
}
