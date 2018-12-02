/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type { ValidationContext } from '../ValidationContext';
import type { ASTVisitor } from '../../language/visitor';
import type { SelectionSetNode } from '../../language/ast';
import { isErrorType, isListType } from '../../type/definition';
import { GraphQLError } from '../../error';

export function missingErrorMessage(fieldName: string): string {
  return `Error field "${fieldName}" is required to be selected`;
}

/**
 * Selected required error fields
 *
 * An error field must be selected if returned in the ObjectType
 */
export function RequireErrorFields(context: ValidationContext): ASTVisitor {
  return {
    SelectionSet: {
      // Validate on leave to allow for deeper errors to appear first.
      leave(node: SelectionSetNode) {
        const fieldDef = context.getFieldDef();

        if (!fieldDef) {
          return false;
        }

        const fields = fieldDef.type._fields || {};
        const entries = Object.entries(fields);
        const errorTypes = entries
          .filter(([_, field]) => {
            if (isListType(field.type)) {
              return isErrorType(field.type.ofType);
            }

            return isErrorType(field.type);
          })
          .map(([name, _]) => name);

        const selections = node.selections.map(
          selection => selection.name.value,
        );

        errorTypes.forEach(error => {
          if (!selections.includes(error)) {
            context.reportError(
              new GraphQLError(missingErrorMessage(error), [node]),
            );
          }
        });
      },
    },
  };
}
