var argv, beautify, beautifyHtml, compile, config, convertDataNgToNg, convertNgToDataNg, escapeBasicAttribute, escapeDoubleBraces, escapeReplacement, escapeTripleBraces, fs, getCloseTag, getRefNames, glob, helpers, htmlEscapeCurlyBraces, processFilters, selfClosingTags, stripComments, unescapeBasicAttributes, unescapeDoubleBraces, unescapeReplacements, unescapeTripleBraces, _, _str,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

argv = require('optimist').argv;

fs = require('fs');

_ = require('lodash');

_str = require('underscore.string');

beautifyHtml = require('js-beautify').html;

helpers = require('./helpers');

config = require('./config');

glob = require('glob');

config = _.defaults({}, argv, {
  ugly: false
});

getRefNames = function(str, options) {
  var depth, map, repeat, repeatText, split, tag, tags, _i, _len;
  tags = str.match(/<.*?>/g);
  map = {};
  if (!tags) {
    return map;
  }
  tags.reverse();
  depth = 0;
  for (_i = 0, _len = tags.length; _i < _len; _i++) {
    tag = tags[_i];
    if (tag.indexOf('</')) {
      depth--;
      if (depth < 0) {
        return map;
      }
    } else {
      depth++;
      repeat = tag.match(/\s(bo|ng)-repeat="(.*?)"/g);
      if (!repeat) {
        continue;
      }
      repeatText = RegExp.$1;
      split = repeatText.split(' in ');
      map[slit[0]] = split[1];
    }
  }
  return map;
};

stripComments = function(str) {
  if (str == null) {
    str = '';
  }
  return str.replace(/<!--[^\[]*?-->/g, '');
};

selfClosingTags = 'area, base, br, col, command, embed, hr, img, input,\
  keygen, link, meta, param, source, track, wbr'.split(/,\s*/);

htmlEscapeCurlyBraces = function(str) {
  return str.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
};

beautify = function(str) {
  var pretty;
  str = str.replace(/\{\{(#|\/)([\s\S]+?)\}\}/g, function(match, type, body) {
    var modifier;
    modifier = type === '#' ? '' : '/';
    return "<" + modifier + "#" + body + ">";
  });
  str = str.replace(/<(\/?#)(.*)>/g, function(match, modifier, body) {
    if (modifier === '/#') {
      modifier = '/';
    }
    return "{{" + modifier + body + "}}";
  });
  pretty = beautifyHtml(str, {
    indent_size: 2,
    indent_inner_html: true,
    preserve_newlines: false
  });
  return pretty;
};

getCloseTag = function(string) {
  var after, afterWithTag, afterWithoutTag, char, close, depth, index, open, out, selfClosing, tag, tagName, _i, _len;
  string = string.trim();
  index = 0;
  depth = 0;
  open = string.match(/<[\s\S]*?>/)[0];
  tagName = string.match(/<\w+/)[0].substring(1);
  string = string.replace(open, '');
  if (__indexOf.call(selfClosingTags, tagName) >= 0) {
    out = {
      before: open,
      after: string
    };
    return out;
  }
  for (index = _i = 0, _len = string.length; _i < _len; index = ++_i) {
    char = string[index];
    if (char === '<' && string[index + 1] === '/') {
      if (!depth) {
        after = string.substr(index);
        close = after.match(/<\/.*?>/)[0];
        afterWithTag = after + close;
        afterWithoutTag = after.substring(close.length);
        return {
          after: afterWithoutTag,
          before: open + '\n' + string.substr(0, index) + close
        };
      } else {
        depth--;
      }
    } else if (char === '<') {
      selfClosing = false;
      tag = string.substr(index).match(/\w+/)[0];
      if (tag && __indexOf.call(selfClosingTags, tag) >= 0) {
        continue;
      }
      depth++;
    }
  }
};

processFilters = function(str) {
  var filterSplit;
  filterSplit = str.split(/\s\|\s/);
  return {
    filters: filterSplit.slice(1).join(' | '),
    replaced: filterSplit[0]
  };
};

escapeReplacement = function(str) {
  return convertNgToDataNg(str);
};

convertNgToDataNg = function(str) {
  return str.replace(/\s(ng|bo)-/g, ' data-$1-');
};

convertDataNgToNg = function(str) {
  return str.replace(/\sdata-(ng|bo)-/g, ' $1-');
};

unescapeReplacements = function(str) {
  return str;
};

escapeBasicAttribute = function(str) {
  return '__ATTR__' + str + '__ATTR__';
};

unescapeBasicAttributes = function(str) {
  return str.replace(/__ATTR__/g, '');
};

escapeDoubleBraces = function(str) {
  return str.replace(/\{\{/g, '__{{__').replace(/\}\}/g, '__}}__');
};

unescapeDoubleBraces = function(str) {
  return str.replace(/__\{\{__/g, '{{').replace(/__\}\}__/g, '}}');
};

escapeTripleBraces = function(str) {
  return str.replace(/\{\{\{/g, '__[[[__').replace(/\}\}\}/g, '__]]]__');
};

unescapeTripleBraces = function(str) {
  return str.replace(/__\[\[\[__/g, '{{{').replace(/__\]\]\]__/g, '}}}');
};

compile = function(options) {
  var beautified, file, filePath, i, interpolated, maxIters, updated;
  filePath = argv.file || options.file;
  if (filePath) {
    helpers.logVerbose('filePath', filePath);
    file = fs.readFileSync(filePath, 'utf8');
  } else {
    file = options.string || options;
  }
  file = file.replace(/::/g, '');
  updated = true;
  interpolated = escapeTripleBraces(stripComments(file));
  i = 0;
  maxIters = 10000;
  while (updated) {
    updated = false;
    if (i++ > maxIters) {
      throw new Error('infinite update loop');
    }
    interpolated = interpolated.replace(/<[^>]*?\s(bo|ng)-repeat="(.*?)"[\s\S]*?>([\S\s]+)/gi, function(match, type, text, post) {
      var close, expressionKeypath, propName, repeatExp, repeatExpSplit;
      helpers.logVerbose('match 1');
      updated = true;
      repeatExp = text;
      repeatExp = repeatExp.trim().replace(/\(\s*(\w+?)\s*,\s*(\w+?)\s*\)/g, '$1,$2');
      if (typeof repeatExp !== 'string') {
        repeatExp = _.compact(repeatExp);
      }
      repeatExpSplit = repeatExp.split(' | ')[0].split('track by')[0].trim().split(/\s+/);
      propName = repeatExpSplit[0];
      repeatExpSplit[0] = "'" + repeatExpSplit[0] + "'";
      repeatExpSplit[repeatExpSplit.length - 1] = "'" + (_.last(repeatExpSplit).replace(/'/g, '"')) + "'";
      repeatExp = repeatExpSplit.join(' ');
      close = getCloseTag(match);
      expressionKeypath = _.last(repeatExpSplit).slice(1, -1);
      if (close) {
        return "{{#forEach " + repeatExp + "}}\n  " + (close.before.replace(/\s(bo|ng)-repeat/, ' data-$1-repeat')) + "\n{{/forEach}}\n" + close.after;
      } else {
        throw new Error('Parse error! Could not find close tag for ng-repeat');
      }
    }).replace(/<[^>]*?\s(?:ng|bo)-if="(.*?)"[\s\S]*?>([\S\s]+)/g, function(match, varName, post) {
      var close, tagName;
      helpers.logVerbose('match 2');
      updated = true;
      if (_.contains(match.replace(post, ''), 'compylr-keep')) {
        return match.replace('ng-if', 'ng-cloak data-ng-if');
      }
      varName = varName.trim();
      tagName = varName.match(/^[\w\.]+$/) ? 'if' : 'ifExpression';
      if (varName.indexOf('!') === 0 && tagName === 'if') {
        tagName = 'unless';
        varName = varName.substr(1);
      } else if (tagName === 'ifExpression') {
        varName = "\"" + varName + "\"";
      }
      close = getCloseTag(match);
      if (close) {
        return "{{#" + tagName + " " + varName + "}}\n" + (close.before.replace(/\s(ng|bo)-if=/, " data-$1-if=")) + "\n{{/" + tagName + "}}\n" + close.after;
      } else {
        throw new Error('Parse error! Could not find close tag for ng-if\n\n' + match + '\n\n' + file);
      }
    }).replace(/<[^>]*?\sng-include="'([^']*?)'"[^>]*?>/, function(match, includePath, post) {
      helpers.logVerbose('match 3');
      updated = true;
      includePath = includePath.replace('.tpl.html', '').replace(/^\//, '');
      match = match.replace(/\sng-include=/, ' data-ng-include=');
      return "" + match + "\n<span data-ng-non-bindable>\n  {{> " + includePath + "}}\n</span>";
    }).replace(/<[^>]*?\sng-include="(.*?\+.*?|[^']*?)"[^>]*?>/, function(match, includePath, post) {
      helpers.logVerbose('match 10');
      updated = true;
      match = match.replace(/\sng-include=/, ' data-ng-include=');
      return escapeDoubleBraces("" + match + "\n<span data-ng-non-bindable>\n  {{dynamicTemplate \"" + includePath + "\"}}\n</span>");
    }).replace(/\s((?:ng|bo)-src|(?:ng|bo)-href|(?:ng|bo)-value)="([\s\S]*?)"/g, function(match, attrName, attrVal) {
      helpers.logVerbose('match 4');
      updated = true;
      if (_.contains(attrName, 'bo-')) {
        match = match.replace(attrVal, "{{expression \"" + (attrVal.split(' | ')[0].trim().replace(/'/g, "\\'")) + "\"}}");
      }
      return match.replace(attrName, attrName.replace(/(ng|bo)-/, ''));
    }).replace(/\scomponent="([\s\S]*?)"/g, function(match, componentName) {
      var ctrlName, templateName;
      helpers.logVerbose('match 12');
      updated = true;
      ctrlName = _.str.classify(componentName);
      componentName = componentName.replace('{{', "'+");
      componentName = componentName.replace('}}', "+'");
      templateName = "modules/components/" + componentName + "/" + componentName + ".tpl.html";
      match = match.replace(/\scomponent=/, ' data-component=');
      return "" + match + " ng-include=\"'" + templateName + "'\" ng-controller=\"" + ctrlName + "Ctrl\" ";
    }).replace(/<(\w+)[^>]*\s((?:ng|bo)-class|(?:ng|bo)-style)\s*=\s*"([^>"]+)"[\s\S]*?>/, function(match, tagName, attrName, attrVal) {
      var type, typeExpressionStr, typeMatch, typeStr, typeStrOpen;
      helpers.logVerbose('match 8');
      type = attrName.substr(3);
      if (type === 'class') {
        return match;
      }
      updated = true;
      typeMatch = match.match(new RegExp("\\s" + type + "=\"([\\s\\S]*?)\""));
      typeStr = typeMatch && typeMatch[0].substr(1) || ("" + type + "=\"\"");
      typeStrOpen = typeStr.substr(0, typeStr.length - 1);
      typeExpressionStr = "{{" + type + "Expression \"" + attrVal + "\"}}";
      if (typeMatch) {
        match = match.replace(typeMatch, '');
      }
      match = match.replace(new RegExp("\\s(ng|bo)-" + type), "data-$1-" + type);
      return match.replace("<" + tagName, "<" + tagName + " " + typeStrOpen + " " + typeExpressionStr + "\" ");
    }).replace(/<[^>]*?([\w\-]+)\s*=\s*"([^">_]*?\{\{[^">]+\}\}[^">_]*?)"[\s\S]*?>/g, function(match, attrName, attrVal) {
      var newAttrVal, trimmedMatch;
      helpers.logVerbose('match 5', {
        attrName: attrName,
        attrVal: attrVal
      });
      trimmedMatch = match.substr(0, match.length - 1);
      if (_str.endsWith(trimmedMatch, '/')) {
        trimmedMatch = trimmedMatch.substr(0, match.length - 1);
      }
      trimmedMatch = trimmedMatch.replace("" + attrName + "=", escapeBasicAttribute("" + attrName + "="));
      if (attrName.indexOf('data-(ng|bo)-attr-') === 0 || _.contains(attrVal, '__{{__')) {
        return match;
      } else {
        updated = true;
        newAttrVal = attrVal.replace(/\{\{([\s\S]+?)\}\}/g, function(match, expression) {
          match = match.trim();
          if (expression.length !== expression.match(/[\w\.]+/)[0].length) {
            return "{{expression '" + (expression.split(' | ')[0].trim().replace(/'/g, "\\'")) + "'}}";
          } else {
            return match.replace(/\[|\]/g, '.');
          }
        });
        trimmedMatch = trimmedMatch.replace(attrVal, escapeDoubleBraces(newAttrVal));
        return "" + trimmedMatch + ">";
      }
    }).replace(/(<[^>]*\stranslate[^>]*>)([\s\S]*?)(<.*?>)/g, function(match, openTag, contents, closeTag) {
      var cleanedContents, cleanedValues, cleanup, values, valuesRe;
      helpers.logVerbose('match 9');
      if (/\|\s*translate/.test(match)) {
        return match;
      }
      if (_.contains(match, '__{{__translate')) {
        return match;
      }
      cleanup = function(str) {
        if (str == null) {
          str = '';
        }
        return str.replace(/'/g, "\\'").replace(/\n/g, ' ');
      };
      valuesRe = /[\s\S]*?translate-values\s*=\s*"([^"]+)"[\s\S]*/;
      if (valuesRe.test(openTag)) {
        values = openTag.replace(valuesRe, '$1');
      }
      cleanedValues = cleanup(values || '{}');
      updated = true;
      cleanedContents = cleanup(contents);
      openTag = openTag.replace(/translate([^a-z\-0-9])/i, "translate=\"" + (contents.trim()) + "\"$1");
      return escapeDoubleBraces("" + openTag + "{{translate '" + (cleanedContents.trim()) + "' '" + cleanedValues + "'}}" + closeTag);
    }).replace(/\s((?:ng|bo)-show|(?:ng|bo)-hide)\s*=\s*"([^"]+)"/g, function(match, showOrHide, expression) {
      var hbsTagType;
      helpers.logVerbose('match 6');
      updated = true;
      hbsTagType = _(showOrHide).contains('-show') ? 'hbsShow' : 'hbsHide';
      match = match.replace(' ' + showOrHide, " data-" + showOrHide);
      return "" + match + " {{" + hbsTagType + " \"" + expression + "\"}}";
    }).replace(/<[^>]*\s((?:ng|bo)-bind|ng-bind-html|bo-html)\s*=\s*"([^"]+?)"[^>]*>[^<]*(<.*?>)/g, function(match, type, expression, closeTag) {
      var expressionTag, str;
      helpers.logVerbose('match 7');
      updated = true;
      str = match.replace(type, "data-" + type);
      if (expression.length !== expression.match(/[\w\.]+/)[0].length) {
        expression = "expression '" + (expression.replace(/'/g, "\\'")) + "'";
      }
      expressionTag = _(type).contains('-html') ? escapeTripleBraces("{{{" + expression + "}}}") : escapeDoubleBraces("{{" + expression + "}}");
      return str = str.replace(closeTag, expressionTag + closeTag);
    });
  }
  updated = true;
  i = 0;
  while (updated) {
    updated = false;
    if (i++ > maxIters) {
      throw new Error('infinite update loop');
    }
    interpolated = interpolated.replace(/<[^>]*?\slocals="([^"]*?)"[\s\S]*?>([\S\s]+)/g, function(match, expression, post) {
      var close;
      helpers.logVerbose('match 11');
      updated = true;
      expression = expression.trim();
      close = getCloseTag(match);
      if (close) {
        return "{{#locals \"" + expression + "\"}}\n  " + (close.before.replace(/\slocals=/, ' data-locals=')) + "\n{{/locals}}\n" + close.after;
      } else {
        throw new Error('Parse error! Could not find close tag for locals directive\n\n' + match + '\n\n' + file);
      }
    });
  }
  i = 0;
  updated = true;
  while (updated) {
    updated = false;
    if (i++ > maxIters) {
      throw new Error('infinite update loop');
    }
    interpolated = interpolated.replace(/\{\{([^#\/>_][\s\S]*?[^_])\}\}/g, function(match, body) {
      var isHelper, prefix, suffix, words, _ref;
      helpers.logVerbose('match 7');
      updated = true;
      body = body.trim();
      words = body.match(/[\w\.]+/);
      isHelper = (_ref = words[0]) === 'json' || _ref === 'expression' || _ref === 'hbsShow' || _ref === 'hbsHide' || _ref === 'classExpression' || _ref === 'styleExpression';
      if (!isHelper) {
        prefix = '';
        suffix = '';
        if (words && words[0].length !== body.length) {
          helpers.logVerbose('body', body);
          prefix = 'expression "';
          suffix = '"';
        }
        return escapeDoubleBraces("{{" + prefix + body + suffix + "}}");
      } else {
        return escapeDoubleBraces(match);
      }
    });
  }
  interpolated = unescapeTripleBraces(interpolated);
  interpolated = unescapeReplacements(interpolated);
  interpolated = unescapeBasicAttributes(interpolated);
  interpolated = convertDataNgToNg(interpolated);
  interpolated = unescapeDoubleBraces(unescapeDoubleBraces(interpolated));
  beautified = beautify(interpolated);
  if (argv.file && !argv['no-write']) {
    fs.writeFileSync('template-output/output.html', beautified);
  }
  return beautified;
};

compile.setHelpers = function(handlebars) {
  return require('./handlebars-helpers')(handlebars);
};

module.exports = compile;
