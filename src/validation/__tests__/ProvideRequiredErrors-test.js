/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import { describe, it } from 'mocha';
import { buildSchema } from '../../utilities';
import { expectFailsRuleWithSchema } from './harness';
import {
  RequireErrorFields,
  missingErrorMessage,
} from '../rules/RequireErrorFields';

function errorTypeRequired(fieldName, line, column) {
  return {
    message: missingErrorMessage(fieldName),
    locations: [{ line, column }],
  };
}

describe('Validate: Selected required errors', () => {
  it('errors for missing selection', () => {
    const schema = buildSchema(`
        error UserError {
          code: String
        }

        type Dog {
          name: String
          userErrors: [UserError]
        }

        type Query {
          dog: Dog
        }
    `);
    expectFailsRuleWithSchema(
      schema,
      RequireErrorFields,
      `
      {
        dog {
          name
        }
      }
    `,
      [errorTypeRequired('userErrors', 3, 13)],
    );
  });
});
