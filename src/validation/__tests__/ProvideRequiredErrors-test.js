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
import { expectFailsRuleWithSchema, expectPassesRuleWithSchema } from './harness';
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

  it('does not return errors when selection an error', () => {
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
    expectPassesRuleWithSchema(
      schema,
      RequireErrorFields,
      `
      {
        dog {
          name
          userErrors {
            code
          }
        }
      }
    `,
    );
  });

  it('errors for missing selection of union of errors', () => {
    const schema = buildSchema(`
        error UserError {
          code: String
        }

        error HTTPError {
          message: String
        }

        union ServiceErrors = UserError | HTTPError

        type Dog {
          name: String
          userErrors: [ServiceErrors]
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

  it('passes rule with fragment selection', () => {
    const schema = buildSchema(`
        error UserError {
          code: String
        }

        error HTTPError {
          message: String
        }

        union ServiceErrors = UserError | HTTPError

        type Dog {
          name: String
          userErrors: [ServiceErrors]
        }

        type Query {
          dog: Dog
        }
    `);
    expectPassesRuleWithSchema(
      schema,
      RequireErrorFields,
      `
      {
        dog {
          name
          userErrors {
            ...on UserError {
              code
            }
          }
        }
      }
    `,
    );
  });
});
