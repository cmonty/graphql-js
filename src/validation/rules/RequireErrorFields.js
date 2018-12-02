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
import type { FieldNode, SelectionSetNode } from '../../language/ast';
import { isErrorType, isListType, isUnionType } from '../../type/definition';
import { GraphQLError } from '../../error';
import { Kind } from '../../language';

export function missingErrorMessage(fieldName: string): string {
  return `Error field "${fieldName}" is required to be selected`;
}

export function missingErrorTypeMessage(typeName: string): string {
  return `Error type "${typeName}" is required to be selected in union`;
}

function getErrorTypes(entries: Array) {
  return entries
    .filter(([_, field]) => {
      if (isListType(field.type)) {
        if (isUnionType(field.type.ofType)) {
          return isErrorType(field.type.ofType._types[0]);
        }

        return isErrorType(field.type.ofType);
      }

      return isErrorType(field.type);
    })
    .map(([name, _]) => name);
}

/**
 * Selected required error fields
 *
 * An error field must be selected if returned in the ObjectType
 */
export function RequireErrorFields(context: ValidationContext): ASTVisitor {
  return {
    // Deal wih unions mixing types and errors
    SelectionSet: {
      leave(node: SelectionSetNode) {
        const fieldDef = context.getFieldDef();

        if (!fieldDef || !isUnionType(fieldDef.type)) {
          return false;
        }

        const inlineFragments = node.selections
          .filter(selection => selection.kind === Kind.INLINE_FRAGMENT)
          .map(selection => selection.typeCondition.name.value);

        if (inlineFragments.length === 0) {
          return false;
        }
        const errorTypes = fieldDef.type._types.filter(type => isErrorType(type));

        errorTypes.forEach(errorType => {
          if (!inlineFragments.includes(errorType.name)) {
            context.reportError(
              new GraphQLError(missingErrorTypeMessage(errorType.name), [node]),
            );
          }
        });
      }
    },
    Field: {
      // Validate on leave to allow for deeper errors to appear first.
      leave(node: FieldNode) {
        const fieldDef = context.getFieldDef();

        if (!fieldDef) {
          return false;
        }

        const fields = fieldDef.type._fields || {};
        const entries = Object.entries(fields);
        const errorTypes = getErrorTypes(entries);

        if (node.selectionSet) {
          const selections = node.selectionSet.selections
            .filter(selection => selection.name)
            .map(
              selection => selection.name.value,
            );

          errorTypes.forEach(error => {
            if (!selections.includes(error)) {
              context.reportError(
                new GraphQLError(missingErrorMessage(error), [node]),
              );
            }
          });
        }
      },
    },
  };
}
