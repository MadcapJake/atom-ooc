'use babel';

import path from 'path';
import { CompositeDisposable } from 'atom';
import { exec, parse } from 'atom-linter';

export default {
  config: {
    samExecutablePath: {
      description: 'Path to the `sam` executable',
      type: 'string',
      default: 'sam'
    },
    samCheckMode: {
      description: 'How deep sam\'s check wil go',
      type: 'string',
      default: 'check',
      enum: ['syntax', 'check', 'codegen']
    }
  },

  activate() {
    require('atom-package-deps').install();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe('atom-ooc.samExecutablePath', samExecutablePath => {
        this.samPath = samExecutablePath;
      })
    );
    this.subscriptions.add(
      atom.config.observe('atom-ooc.samCheckMode', samCheckMode => {
        this.samCheck = samCheckMode;
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  provideLinter() {
    const regex =
      '(?<file>[\\w/\\-]+\\.ooc):(?<line>\\d+):(?<col>\\d+) (?<type>\\w+) (?<message>.*)';
    return {
      name: 'ooc',
      grammarScopes: ['source.ooc'],
      scope: 'file',
      lintOnFly: true,
      lint: textEditor => {
        const filePath = textEditor.getPath();
        const fdirPath = path.dirname(filePath);
        const projPath = fdirPath.substring(0, fdirPath.search(/source/));
        const samArgs = ['check', '--mode', this.samCheck, filePath];

        if (!textEditor.getText()) {
          return Promise.resolve([]);
        }

        return exec(this.samPath, samArgs).then((output) => {
          // console.log(output);
          const parsed = parse(output, regex);
          if (parsed.length !== 0) {
            for (const error of parsed) {
              error.range[1][1] += 1;
              error.filePath = path.join(projPath, error.filePath);
              if (error.text.search(/Trail = /) !== -1) {
                error.text = error.text.substring(0, error.text.length - 8);
              }
            }
          }
          // console.log(parsed);
          return parsed;
        });
      }
    };
  }
};
