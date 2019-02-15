

const owsCommon = require('@owstack/ows-common');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

class Lock {
    constructor() {
        this.tasks = {};
    }
}

Lock.prototype._release = function (token, task) {
    if (!task.running) {
        return;
    }
    task.running = false;
    this.tasks[token] = lodash.without(this.tasks[token], task);
    this._runOne(token);
};

Lock.prototype._runOne = function (token) {
    const self = this;

    if (lodash.some(self.tasks[token], {
        running: true
    })) {
        return;
    }

    const task = lodash.head(self.tasks[token]);
    if (!task) {
        return;
    }

    task.running = true;

    if (task.timeout > 0) {
        setTimeout(function () {
            self._release(token, task);
        }, task.timeout);
    }

    task.fn(null, function () {
        self._release(token, task);
    });
};

Lock.prototype.locked = function (token, wait, max, userTask) {
    const self = this;

    if (lodash.isUndefined(self.tasks[token])) {
        self.tasks[token] = [];
    }

    const task = {
        timeout: max,
        running: false,
        fn: userTask,
    };
    self.tasks[token].push(task);

    if (wait > 0) {
        setTimeout(function () {
            if (task.running || !lodash.includes(self.tasks[token], task)) {
                return;
            }
            self.tasks[token] = lodash.without(self.tasks[token], task);
            task.fn(new Error(`Could not acquire lock ${  token}`));
        }, wait);
    }

    self._runOne(token);
};

module.exports = Lock;
