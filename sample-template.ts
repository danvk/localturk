import {dedent, htmlEntities} from './utils';

/**
 * Write out a sample template file for a given input CSV.
 */
export function makeTemplate(columnNames: string[]) {
  const inputs = columnNames.map(column => column + ': ${' + column + '}');
  return dedent`
    ${inputs.join('<br>\n    ')}

    <!-- Use named form elements to generate output as desired. -->
    <input type="text" size="80" name="notes" placeholder="Notes go here">
    <input type="submit" name="result" value="Class A">
    <input type="submit" name="result" value="Class B">`;
}
