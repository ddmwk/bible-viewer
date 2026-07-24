import { CHANGE_REPORT_PATH, writeBibleSourceChangeReport } from './bible-source-change-report-lib.mjs';

const report = await writeBibleSourceChangeReport();

console.log(
  [
    'Bible source change report generated.',
    `path=${CHANGE_REPORT_PATH}`,
    `items=${report.summary.totalItems}`,
    `hardErrors=${report.summary.hardErrors}`,
    `warnings=${report.summary.warnings}`,
  ].join(' '),
);
