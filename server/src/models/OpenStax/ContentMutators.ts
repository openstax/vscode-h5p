import { parseToDOM } from '../../utils';
import * as xpath from 'xpath-ts';
import { XMLSerializer } from '@xmldom/xmldom';

interface ContentField {
  name: string;
  fqPath: string[];
  value: unknown;
  parent: Partial<unknown> | undefined;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

interface HTMLContentField extends ContentField {
  value: string;
  parent: Partial<unknown> | undefined;
  type: 'string';
}

export interface HTMLContent {
  document: Document;
  xpath: <T>(query: string, nsmap?: Record<string, string>) => T[];
  serialize: () => string;
}

function isHTMLField(field: ContentField): field is HTMLContentField {
  return typeof field.value === 'string' && field.value.length > 0;
}

export function parseAsHTML(value: string): HTMLContent {
  const serializer = new XMLSerializer();
  const document = parseToDOM(`<root>${value}</root>`, 'text/html');
  return {
    document,
    xpath<T>(query: string, nsmap?: Record<string, string>): T[] {
      return xpath.useNamespaces({
        h: 'http://www.w3.org/1999/xhtml',
        ...nsmap,
      })(query, this.document) as T[];
    },
    serialize() {
      const serialized = serializer.serializeToString(this.document);
      // Slice off <root...> and </root>
      return serialized.slice(serialized.indexOf('>') + 1, -7);
    },
  };
}

export function iterContent(
  content: unknown,
  handler: (field: ContentField) => void,
) {
  const recurse = (
    name: string,
    value: unknown,
    parent: Partial<unknown> | undefined,
    prevPath: string[],
  ) => {
    const fqPath = [...prevPath, name];
    const jsType = typeof value;
    switch (jsType) {
      case 'string':
      case 'number':
      case 'boolean':
        handler({ name, fqPath, value, parent, type: jsType });
        return;
      case 'object': {
        const type = Array.isArray(value) ? 'array' : 'object';
        handler({ name, fqPath, value, parent, type });
        if (value != null) {
          Object.entries(value).forEach(([k, v]) => {
            recurse(k, v, value, fqPath);
          });
        }
      }
    }
  };
  recurse('', content, undefined, []);
}

export function iterHTML(
  content: unknown,
  handler: (args: {
    fieldName: string;
    fqPath: string[];
    document: HTMLContent;
  }) => void,
) {
  iterContent(content, (field) => {
    if (isHTMLField(field) && field.parent !== undefined) {
      const document = parseAsHTML(field.value);
      handler({ fieldName: field.name, fqPath: field.fqPath, document });
      Reflect.set(field.parent, field.name, document.serialize());
    }
  });
}
